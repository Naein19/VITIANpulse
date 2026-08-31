import 'server-only';
import { createHash } from 'node:crypto';
import { getPrivilegedStore, getStore, type Filter } from '@/server/db';
import { env } from '@/lib/env';
import type { AnalyticsEventName, Club, Post, CampusEvent, PyqPaper, AdCampaign } from '@/types/domain';

/**
 * First-party analytics.
 *
 * Privacy model: no cookies, no cross-site identifiers, no IP storage. A daily
 * rotating hash of (salt + date + coarse request fingerprint) gives an
 * approximate unique count that becomes meaningless after 24 hours and cannot be
 * reversed to a person.
 */

export function visitorHash(fingerprint: string, at = new Date()): string {
  const day = at.toISOString().slice(0, 10);
  return createHash('sha256').update(`${env.ANALYTICS_SALT}:${day}:${fingerprint}`).digest('hex').slice(0, 24);
}

export interface TrackInput {
  name: AnalyticsEventName;
  path: string;
  entityId?: string | null;
  visitorHash: string;
  meta?: Record<string, string | number | boolean | null>;
}

export async function track(input: TrackInput): Promise<void> {
  const store = await getPrivilegedStore();
  await store.insert('analytics_events', {
    name: input.name,
    path: input.path.slice(0, 300),
    entityId: input.entityId ?? null,
    visitorHash: input.visitorHash,
    meta: input.meta ?? {},
    createdAt: new Date().toISOString(),
  });
}

/** Never let a metrics failure break a page render. */
export async function trackSafe(input: TrackInput): Promise<void> {
  try {
    await track(input);
  } catch (error) {
    console.warn('[vitpulse] analytics write failed:', (error as Error).message);
  }
}

export interface AnalyticsRange {
  days: number;
}

interface RawEvent {
  id: string;
  name: AnalyticsEventName;
  path: string;
  entityId: string | null;
  visitorHash: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

async function eventsSince(days: number): Promise<RawEvent[]> {
  const store = await getPrivilegedStore();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const filters: Filter[] = [{ op: 'gte', col: 'createdAt', value: since }];
  const { rows } = await store.select<RawEvent>({
    table: 'analytics_events',
    filters,
    order: [{ col: 'createdAt', dir: 'desc' }],
    limit: 20_000,
  });
  return rows;
}

export interface DailyPoint {
  date: string;
  views: number;
  visitors: number;
}

export interface TopItem {
  id: string;
  label: string;
  href: string | null;
  count: number;
}

export interface AnalyticsSummary {
  range: number;
  totals: {
    pageViews: number;
    uniqueVisitors: number;
    eventViews: number;
    registrationClicks: number;
    pyqDownloads: number;
    searches: number;
    bookmarks: number;
    clubFollows: number;
    adImpressions: number;
    adClicks: number;
  };
  ctr: number;
  daily: DailyPoint[];
  topPages: TopItem[];
  topEvents: TopItem[];
  topClubs: TopItem[];
  topPosts: TopItem[];
  topSearches: TopItem[];
  topPapers: TopItem[];
  adPerformance: Array<{ id: string; label: string; impressions: number; clicks: number; ctr: number }>;
}

function countBy<T>(items: readonly T[], key: (item: T) => string | null): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

function topN(map: Map<string, number>, n: number): Array<[string, number]> {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

/**
 * Builds the admin analytics dashboard.
 *
 * Reads the raw event log once and derives every panel from it in memory. At
 * campus scale (tens of thousands of events per month) this is well within
 * budget; the query is capped and the shape is ready to move to a materialised
 * view if it ever is not.
 */
export async function analyticsSummary({ days }: AnalyticsRange = { days: 30 }): Promise<AnalyticsSummary> {
  const events = await eventsSince(days);
  const store = await getStore();

  const named = (name: AnalyticsEventName) => events.filter((e) => e.name === name);

  const pageViews = named('page_view');
  const dailyMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    dailyMap.set(date, { views: 0, visitors: new Set() });
  }
  for (const event of pageViews) {
    const date = event.createdAt.slice(0, 10);
    const bucket = dailyMap.get(date);
    if (!bucket) continue;
    bucket.views += 1;
    bucket.visitors.add(event.visitorHash);
  }

  const adImpressions = named('ad_impression').length;
  const adClicks = named('ad_click').length;

  const eventViewCounts = countBy(named('event_view'), (e) => e.entityId);
  const postViewCounts = countBy(named('post_view'), (e) => e.entityId);
  const clubFollowCounts = countBy(named('club_follow'), (e) => e.entityId);
  const paperCounts = countBy(named('pyq_download'), (e) => e.entityId);
  const searchCounts = countBy(named('search'), (e) => {
    const q = e.meta?.['query'];
    return typeof q === 'string' && q.length > 1 ? q.toLowerCase() : null;
  });

  const [topEvents, topPosts, topClubs, topPapers, adRows] = await Promise.all([
    labelEntities(topN(eventViewCounts, 8), 'events', (row) => ({
      label: String((row as unknown as CampusEvent).title),
      href: `/events/${(row as unknown as CampusEvent).slug}`,
    })),
    labelEntities(topN(postViewCounts, 8), 'posts', (row) => ({
      label: String((row as unknown as Post).title),
      href: `/news/${(row as unknown as Post).slug}`,
    })),
    labelEntities(topN(clubFollowCounts, 8), 'clubs', (row) => ({
      label: String((row as unknown as Club).name),
      href: `/clubs/${(row as unknown as Club).slug}`,
    })),
    labelEntities(topN(paperCounts, 8), 'pyq_papers', (row) => {
      const p = row as unknown as PyqPaper;
      return { label: `${p.subjectCode} · ${p.examType} ${p.year}`, href: `/pyqs/${p.branch.toLowerCase()}` };
    }),
    store.select<AdCampaign>({
      table: 'ads',
      filters: [{ op: 'in', col: 'status', values: ['APPROVED', 'PAUSED', 'ENDED'] }],
      order: [{ col: 'impressionCount', dir: 'desc' }],
      limit: 10,
    }),
  ]);

  return {
    range: days,
    totals: {
      pageViews: pageViews.length,
      uniqueVisitors: new Set(pageViews.map((e) => e.visitorHash)).size,
      eventViews: named('event_view').length,
      registrationClicks: named('event_register_click').length,
      pyqDownloads: named('pyq_download').length,
      searches: named('search').length,
      bookmarks: named('bookmark').length,
      clubFollows: named('club_follow').length,
      adImpressions,
      adClicks,
    },
    ctr: adImpressions > 0 ? Math.round((adClicks / adImpressions) * 10_000) / 100 : 0,
    daily: [...dailyMap.entries()].map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size })),
    topPages: topN(countBy(pageViews, (e) => e.path), 10).map(([path, count]) => ({
      id: path,
      label: path,
      href: path,
      count,
    })),
    topEvents,
    topPosts,
    topClubs,
    topPapers,
    topSearches: topN(searchCounts, 10).map(([query, count]) => ({
      id: query,
      label: query,
      href: `/search?q=${encodeURIComponent(query)}`,
      count,
    })),
    adPerformance: adRows.rows.map((ad) => ({
      id: ad.id,
      label: ad.name,
      impressions: ad.impressionCount,
      clicks: ad.clickCount,
      ctr: ad.impressionCount > 0 ? Math.round((ad.clickCount / ad.impressionCount) * 10_000) / 100 : 0,
    })),
  };
}

async function labelEntities(
  entries: Array<[string, number]>,
  table: 'events' | 'posts' | 'clubs' | 'pyq_papers',
  describe: (row: Record<string, unknown>) => { label: string; href: string | null },
): Promise<TopItem[]> {
  if (entries.length === 0) return [];
  const store = await getStore();
  const { rows } = await store.select({
    table,
    filters: [{ op: 'in', col: 'id', values: entries.map(([id]) => id) }],
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return entries.flatMap(([id, count]) => {
    const row = byId.get(id);
    if (!row) return [];
    const { label, href } = describe(row);
    return [{ id, label, href, count }];
  });
}

/** Headline counters for the admin overview, independent of the event log. */
export async function platformCounts(): Promise<Record<string, number>> {
  const store = await getStore();
  const tables = [
    ['students', 'profiles'],
    ['clubs', 'clubs'],
    ['events', 'events'],
    ['posts', 'posts'],
    ['opportunities', 'opportunities'],
    ['papers', 'pyq_papers'],
    ['discussions', 'discussions'],
  ] as const;

  const results = await Promise.all(
    tables.map(async ([label, table]) => {
      const { total } = await store.select({ table, limit: 1 });
      return [label, total] as const;
    }),
  );
  return Object.fromEntries(results);
}
