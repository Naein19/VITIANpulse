import 'server-only';
import { getStore, getPrivilegedStore } from '@/server/db';
import type { AdCampaign, AdPlacement, AdWithClub, Club } from '@/types/domain';
import { toClubSummary } from './posts';

/**
 * Advertisement serving and measurement.
 *
 * Creatives are plain text only — headline, body and CTA label are sanitised at
 * the schema boundary and rendered as React children, so an advertiser can never
 * inject markup or script. The CTA URL passes `safeExternalUrl`, and clicks are
 * routed through `/api/ads/[id]/click` so the destination is re-validated
 * server-side at click time and the click is counted exactly once.
 */

export interface AdSlotQuery {
  placement: AdPlacement;
  limit?: number;
}

function isServable(ad: AdCampaign, now: number): boolean {
  if (ad.status !== 'APPROVED') return false;
  if (Date.parse(ad.startsAt) > now) return false;
  if (Date.parse(ad.endsAt) < now) return false;
  if (ad.impressionCap !== null && ad.impressionCount >= ad.impressionCap) return false;
  return true;
}

/** Selects the ads to render in a slot: highest priority, then least served. */
export async function selectAds(query: AdSlotQuery): Promise<AdWithClub[]> {
  const store = await getStore();
  const limit = query.limit ?? 1;
  const now = Date.now();

  const { rows } = await store.select<AdCampaign>({
    table: 'ads',
    filters: [
      { op: 'eq', col: 'placement', value: query.placement },
      { op: 'eq', col: 'status', value: 'APPROVED' },
    ],
    order: [{ col: 'priority', dir: 'desc' }],
    limit: 25,
  });

  const servable = rows
    .filter((ad) => isServable(ad, now))
    // Even rotation within a priority band: the least-served campaign wins.
    .sort((a, b) => b.priority - a.priority || a.impressionCount - b.impressionCount)
    .slice(0, limit);

  return hydrateAds(servable);
}

export async function hydrateAds(ads: readonly AdCampaign[]): Promise<AdWithClub[]> {
  if (ads.length === 0) return [];
  const store = await getStore();
  const clubIds = [...new Set(ads.map((a) => a.clubId))];
  const { rows } = await store.select<Club>({
    table: 'clubs',
    filters: [{ op: 'in', col: 'id', values: clubIds }],
  });
  const byId = new Map(rows.map((c) => [c.id, toClubSummary(c)]));
  return ads.map((ad) => ({ ...ad, club: byId.get(ad.clubId) ?? null }));
}

export async function getAdById(id: string): Promise<AdCampaign | null> {
  const store = await getStore();
  return store.selectOne<AdCampaign>({ table: 'ads', filters: [{ op: 'eq', col: 'id', value: id }] });
}

export interface AdAdminQuery {
  status?: AdCampaign['status'] | 'ALL';
  clubId?: string;
  placement?: AdPlacement | 'ALL';
}

export async function listAdsForAdmin(query: AdAdminQuery = {}): Promise<AdWithClub[]> {
  const store = await getStore();
  const filters = [];
  if (query.status && query.status !== 'ALL') filters.push({ op: 'eq' as const, col: 'status', value: query.status });
  if (query.clubId) filters.push({ op: 'eq' as const, col: 'clubId', value: query.clubId });
  if (query.placement && query.placement !== 'ALL') {
    filters.push({ op: 'eq' as const, col: 'placement', value: query.placement });
  }
  const { rows } = await store.select<AdCampaign>({
    table: 'ads',
    filters,
    order: [{ col: 'updatedAt', dir: 'desc' }],
    limit: 100,
  });
  return hydrateAds(rows);
}

/**
 * Records an impression.
 *
 * Deliberately fire-and-forget from the caller's perspective and written through
 * the privileged store: a student has no direct write permission on `ads`, but
 * viewing one must still be counted.
 */
export async function recordImpression(adId: string, visitorHash: string): Promise<void> {
  const store = await getPrivilegedStore();
  const ad = await store.selectOne<AdCampaign>({ table: 'ads', filters: [{ op: 'eq', col: 'id', value: adId }] });
  if (!ad || !isServable(ad, Date.now())) return;

  // One impression per campaign per visitor per hour keeps refresh-spam out of
  // the numbers without storing anything that identifies the visitor.
  const hourBucket = new Date().toISOString().slice(0, 13);
  const dedupeKey = `${adId}:${visitorHash}:${hourBucket}`;
  const existing = await store.selectOne({
    table: 'ad_events',
    filters: [
      { op: 'eq', col: 'dedupeKey', value: dedupeKey },
      { op: 'eq', col: 'kind', value: 'IMPRESSION' },
    ],
  });
  if (existing) return;

  await store.insert('ad_events', {
    adId,
    kind: 'IMPRESSION',
    dedupeKey,
    createdAt: new Date().toISOString(),
  });
  await store.increment('ads', adId, 'impressionCount');
}

/** Records a click and returns the validated destination, or null if unservable. */
export async function recordClick(adId: string, visitorHash: string): Promise<string | null> {
  const store = await getPrivilegedStore();
  const ad = await store.selectOne<AdCampaign>({ table: 'ads', filters: [{ op: 'eq', col: 'id', value: adId }] });
  if (!ad) return null;
  // A click on an ad that has just expired still redirects (the user asked for
  // it) but is not counted against a finished campaign.
  if (!isServable(ad, Date.now())) return ad.ctaUrl;

  const minuteBucket = new Date().toISOString().slice(0, 16);
  const dedupeKey = `${adId}:${visitorHash}:${minuteBucket}`;
  const existing = await store.selectOne({
    table: 'ad_events',
    filters: [
      { op: 'eq', col: 'dedupeKey', value: dedupeKey },
      { op: 'eq', col: 'kind', value: 'CLICK' },
    ],
  });
  if (!existing) {
    await store.insert('ad_events', {
      adId,
      kind: 'CLICK',
      dedupeKey,
      createdAt: new Date().toISOString(),
    });
    await store.increment('ads', adId, 'clickCount');
  }
  return ad.ctaUrl;
}

export interface AdPerformance {
  ad: AdWithClub;
  ctr: number;
  daysRemaining: number;
  capUsed: number | null;
}

export function performanceOf(ad: AdWithClub, now = Date.now()): AdPerformance {
  const ctr = ad.impressionCount > 0 ? (ad.clickCount / ad.impressionCount) * 100 : 0;
  const daysRemaining = Math.max(0, Math.ceil((Date.parse(ad.endsAt) - now) / 86_400_000));
  const capUsed = ad.impressionCap ? (ad.impressionCount / ad.impressionCap) * 100 : null;
  return { ad, ctr: Math.round(ctr * 100) / 100, daysRemaining, capUsed };
}
