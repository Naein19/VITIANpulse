import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChips } from '@/components/ui/tabs';
import { Stat } from '@/components/ui/misc';
import { AdReviewCard } from '@/components/admin/ad-review-card';
import { pageMetadata } from '@/lib/metadata';
import { formatCount, formatPercent } from '@/lib/format';
import { requirePagePermission } from '@/server/auth/session';
import { listAdsForAdmin, performanceOf } from '@/server/db/repositories/ads';
import { AD_STATUSES, type AdStatus } from '@/types/domain';
import { enumParam, hrefBuilder, type SearchParams } from '@/lib/query-params';

/**
 * Advertisement review and campaign analytics.
 *
 * Approving a campaign is what makes it servable — until then it never reaches
 * a student. Creatives are plain text, so review is about the claim and the
 * destination, not about sanitising markup.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Ads',
  description: 'Review club campaigns.',
  path: '/admin/ads',
  noIndex: true,
});

export default async function AdminAdsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePagePermission('ad:review');
  const params = await searchParams;
  const status = enumParam<AdStatus | 'ALL'>(params, 'status', [...AD_STATUSES, 'ALL'], 'PENDING_REVIEW');

  const [shown, all] = await Promise.all([
    listAdsForAdmin({ status }),
    listAdsForAdmin({ status: 'ALL' }),
  ]);

  const buildHref = hrefBuilder('/admin/ads', params, { defaults: { status: 'PENDING_REVIEW' } });
  const now = Date.now();

  const totalImpressions = all.reduce((sum, ad) => sum + ad.impressionCount, 0);
  const totalClicks = all.reduce((sum, ad) => sum + ad.clickCount, 0);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const live = all.filter((ad) => ad.status === 'APPROVED').length;

  const counts = AD_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = all.filter((ad) => ad.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <p className="t-eyebrow mb-1 text-faint">Console</p>
        <h1 className="t-h2 text-ink">Club advertisements</h1>
        <p className="t-prose mt-2 max-w-2xl text-soft">
          Clubs submit promotions; nothing serves until it is approved here. Check the claim is accurate and the
          destination is a real, safe link — advertisers cannot submit markup, only text.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Live campaigns" value={live} tone="brand" />
        <Stat label="Impressions" value={formatCount(totalImpressions)} />
        <Stat label="Clicks" value={formatCount(totalClicks)} />
        <Stat label="Overall CTR" value={formatPercent(ctr, 2)} />
      </section>

      <FilterChips
        label="Campaign status"
        activeKey={status}
        items={[
          { key: 'ALL', label: 'All', href: buildHref({ status: 'ALL' }), count: all.length },
          ...AD_STATUSES.map((s) => ({
            key: s,
            label: s.replace(/_/g, ' ').toLowerCase(),
            href: buildHref({ status: s }),
            count: counts[s] ?? 0,
          })),
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns here"
          description="Club submissions land in the pending queue. Approved campaigns start serving within their scheduled window."
        />
      ) : (
        <ul className="space-y-4">
          {shown.map((ad) => (
            <li key={ad.id}>
              <AdReviewCard ad={ad} performance={performanceOf(ad, now)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
