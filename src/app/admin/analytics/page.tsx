import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { Stat } from '@/components/ui/misc';
import { SegmentedControl } from '@/components/ui/tabs';
import { Table, Th, Td, Tr } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { TrafficChart } from '@/components/admin/traffic-chart';
import { pageMetadata } from '@/lib/metadata';
import { formatCount, formatPercent } from '@/lib/format';
import { requirePagePermission } from '@/server/auth/session';
import { analyticsSummary } from '@/server/db/repositories/analytics';
import { enumParam, type SearchParams } from '@/lib/query-params';

/** First-party analytics dashboard. No third-party trackers, no cookies. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Analytics',
  description: 'Platform analytics.',
  path: '/admin/analytics',
  noIndex: true,
});

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePagePermission('analytics:view');
  const params = await searchParams;
  const range = enumParam(params, 'range', ['7', '30', '90'] as const, '30');
  const summary = await analyticsSummary({ days: Number(range) });

  const hasData = summary.totals.pageViews > 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow mb-1 text-faint">Console</p>
          <h1 className="t-h2 text-ink">Analytics</h1>
          <p className="t-prose mt-2 max-w-2xl text-soft">
            First-party only. No cookies and no cross-site identifiers — unique counts come from a hash that rotates
            daily and cannot be reversed to a person.
          </p>
        </div>
        <SegmentedControl
          activeKey={range}
          items={[
            { key: '7', label: '7 days', href: '/admin/analytics?range=7' },
            { key: '30', label: '30 days', href: '/admin/analytics?range=30' },
            { key: '90', label: '90 days', href: '/admin/analytics?range=90' },
          ]}
        />
      </header>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="No traffic recorded yet"
          description="Page views are collected as students browse. Open a few pages and they will appear here within moments."
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Page views" value={formatCount(summary.totals.pageViews)} tone="brand" />
            <Stat label="Unique visitors" value={formatCount(summary.totals.uniqueVisitors)} hint="Daily rotating hash" />
            <Stat label="Event views" value={formatCount(summary.totals.eventViews)} />
            <Stat label="Registration clicks" value={formatCount(summary.totals.registrationClicks)} />
            <Stat label="PYQ downloads" value={formatCount(summary.totals.pyqDownloads)} />
            <Stat label="Searches" value={formatCount(summary.totals.searches)} />
            <Stat label="Club follows" value={formatCount(summary.totals.clubFollows)} />
            <Stat
              label="Ad CTR"
              value={formatPercent(summary.ctr, 2)}
              hint={`${formatCount(summary.totals.adClicks)} of ${formatCount(summary.totals.adImpressions)}`}
            />
          </section>

          <section>
            <h2 className="t-label mb-3 border-b border-line pb-2 text-faint">Traffic</h2>
            <TrafficChart points={summary.daily} />
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <TopTable title="Most viewed events" items={summary.topEvents} unit="views" />
            <TopTable title="Most viewed stories" items={summary.topPosts} unit="views" />
            <TopTable title="Most followed clubs" items={summary.topClubs} unit="follows" />
            <TopTable title="Most downloaded papers" items={summary.topPapers} unit="downloads" />
            <TopTable title="Top pages" items={summary.topPages} unit="views" />
            <TopTable title="Top searches" items={summary.topSearches} unit="searches" />
          </div>

          {summary.adPerformance.length > 0 && (
            <section>
              <h2 className="t-label mb-3 border-b border-line pb-2 text-faint">Campaign performance</h2>
              <Table caption="Advertisement campaign performance">
                <thead>
                  <tr>
                    <Th>Campaign</Th>
                    <Th className="text-right">Impressions</Th>
                    <Th className="text-right">Clicks</Th>
                    <Th className="text-right">CTR</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.adPerformance.map((ad) => (
                    <Tr key={ad.id}>
                      <Td className="font-medium text-ink">{ad.label}</Td>
                      <Td className="vp-numeric text-right">{formatCount(ad.impressions)}</Td>
                      <Td className="vp-numeric text-right">{formatCount(ad.clicks)}</Td>
                      <Td className="vp-numeric text-right font-semibold text-ink">{formatPercent(ad.ctr, 2)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TopTable({
  title,
  items,
  unit,
}: {
  title: string;
  items: ReadonlyArray<{ id: string; label: string; href: string | null; count: number }>;
  unit: string;
}) {
  return (
    <section>
      <h2 className="t-label mb-3 border-b border-line pb-2 text-faint">{title}</h2>
      {items.length === 0 ? (
        <p className="py-4 text-[12.5px] text-faint">Nothing recorded in this range.</p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-md border border-line bg-primary">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <span className="vp-numeric w-5 shrink-0 text-right text-[11px] text-faint">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-soft">
                {item.href ? (
                  <Link href={item.href} className="hover:text-ink hover:underline underline-offset-2">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </span>
              <span className="vp-numeric shrink-0 text-[12.5px] font-semibold text-ink">
                {formatCount(item.count)}
                <span className="ml-1 font-normal text-faint">{unit}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
