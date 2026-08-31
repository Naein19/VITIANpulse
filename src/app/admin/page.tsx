import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Flag, FileText, Megaphone, Newspaper } from 'lucide-react';
import { Stat } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, Th, Td, Tr } from '@/components/ui/table';
import { pageMetadata } from '@/lib/metadata';
import { formatCount, formatRelative, humanise } from '@/lib/format';
import { getSessionUser } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { platformCounts, analyticsSummary } from '@/server/db/repositories/analytics';
import { countOpenReports } from '@/server/db/repositories/community';
import { listAdsForAdmin } from '@/server/db/repositories/ads';
import { listPyqPapers } from '@/server/db/repositories/catalog';
import { listPostsForAdmin } from '@/server/db/repositories/posts';
import { listAuditLog } from '@/server/db/repositories/admin';

/** Admin overview: what needs attention, and what the platform looks like. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Admin console',
  description: 'Platform overview.',
  path: '/admin',
  noIndex: true,
});

export default async function AdminOverviewPage() {
  const user = await getSessionUser();
  const [counts, reports, pendingAds, pendingPyqs, pendingPosts, audit, analytics] = await Promise.all([
    platformCounts(),
    countOpenReports(),
    listAdsForAdmin({ status: 'PENDING_REVIEW' }),
    listPyqPapers({ status: 'PENDING_REVIEW', pageSize: 5 }),
    listPostsForAdmin({ status: 'PENDING_REVIEW', pageSize: 5 }),
    can(user?.role, 'audit:view') ? listAuditLog(12) : Promise.resolve([]),
    can(user?.role, 'analytics:view') ? analyticsSummary({ days: 7 }) : Promise.resolve(null),
  ]);

  const now = Date.now();
  const queues = [
    { label: 'Reports', count: reports, href: '/admin/moderation', icon: Flag, permission: 'moderation:queue' as const },
    { label: 'Ads awaiting review', count: pendingAds.length, href: '/admin/ads', icon: Megaphone, permission: 'ad:review' as const },
    { label: 'PYQ uploads', count: pendingPyqs.total, href: '/admin/pyqs', icon: FileText, permission: 'pyq:approve' as const },
    { label: 'Posts in review', count: pendingPosts.total, href: '/admin/posts', icon: Newspaper, permission: 'post:publish' as const },
  ].filter((q) => can(user?.role, q.permission));

  return (
    <div className="space-y-9">
      <header>
        <p className="t-eyebrow mb-1 text-faint">Console</p>
        <h1 className="t-h2 text-ink">Overview</h1>
        <p className="t-prose mt-2 max-w-2xl text-soft">
          What needs a decision, and how the platform is doing. Everything you approve or reject here is recorded in the
          audit log with your name against it.
        </p>
      </header>

      {queues.length > 0 && (
        <section>
          <h2 className="t-label mb-3 border-b border-line pb-2 text-faint">Needs attention</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {queues.map((queue) => (
              <Link
                key={queue.label}
                href={queue.href}
                className="group flex items-start gap-3 rounded-md border border-line bg-primary p-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${
                    queue.count > 0 ? 'border-red/40 bg-danger-soft text-danger-ink' : 'border-line bg-tertiary text-faint'
                  }`}
                >
                  <queue.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="vp-numeric block text-[22px] font-bold leading-none text-ink">{queue.count}</span>
                  <span className="mt-1 block text-[12.5px] text-muted">{queue.label}</span>
                </span>
                <ArrowRight
                  className="mt-1 size-3.5 shrink-0 -translate-x-1 text-faint opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="t-label mb-3 border-b border-line pb-2 text-faint">Platform</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Students" value={formatCount(counts.students ?? 0)} />
          <Stat label="Clubs" value={formatCount(counts.clubs ?? 0)} />
          <Stat label="Events" value={formatCount(counts.events ?? 0)} />
          <Stat label="Posts" value={formatCount(counts.posts ?? 0)} />
          <Stat label="Opportunities" value={formatCount(counts.opportunities ?? 0)} />
          <Stat label="Question papers" value={formatCount(counts.papers ?? 0)} />
          <Stat label="Discussions" value={formatCount(counts.discussions ?? 0)} />
          {analytics && (
            <Stat
              label="Views (7d)"
              value={formatCount(analytics.totals.pageViews)}
              hint={`${formatCount(analytics.totals.uniqueVisitors)} unique`}
              tone="brand"
            />
          )}
        </div>
        {analytics && (
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <Link href="/admin/analytics">
              Full analytics
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </section>

      {audit.length > 0 && (
        <section>
          <h2 className="t-label mb-3 border-b border-line pb-2 text-faint">Recent activity</h2>
          <Table caption="Recent administrative actions">
            <thead>
              <tr>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>By</Th>
                <Th className="text-right">When</Th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <Tr key={entry.id}>
                  <Td>
                    <Badge tone="outline" size="xs">{humanise(entry.action)}</Badge>
                    {entry.detail && <span className="ml-2 text-[12px] text-faint">{entry.detail}</span>}
                  </Td>
                  <Td className="font-mono text-[11.5px] text-faint">{entry.entityType}</Td>
                  <Td className="text-[12.5px]">{entry.actorName}</Td>
                  <Td className="text-right text-[12px] text-faint">{formatRelative(entry.createdAt, now)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}
    </div>
  );
}
