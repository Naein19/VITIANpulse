import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs } from '@/components/ui/tabs';
import { ModerationCard } from '@/components/admin/moderation-card';
import { LostFoundQueue } from '@/components/admin/lost-found-queue';
import { pageMetadata } from '@/lib/metadata';
import { requirePagePermission } from '@/server/auth/session';
import { listReports } from '@/server/db/repositories/community';
import { listLostFound } from '@/server/db/repositories/community';
import { enumParam, type SearchParams } from '@/lib/query-params';

/** The moderation queue: reports plus lost & found listings awaiting review. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Moderation',
  description: 'Reported content and pending listings.',
  path: '/admin/moderation',
  noIndex: true,
});

export default async function ModerationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePagePermission('moderation:queue');
  const params = await searchParams;
  const tab = enumParam(params, 'tab', ['open', 'lostfound', 'resolved'] as const, 'open');

  // `reports` is always the open set: it feeds the tab's count badge as well as
  // the open tab's list. The resolved set is only fetched when it is shown.
  const [reports, resolved, pendingListings] = await Promise.all([
    listReports('OPEN'),
    tab === 'resolved' ? listReports('RESOLVED') : Promise.resolve([]),
    listLostFound({ status: 'PENDING_REVIEW', pageSize: 30 }),
  ]);

  const shown = tab === 'resolved' ? resolved : reports;

  return (
    <div className="space-y-6">
      <header>
        <p className="t-eyebrow mb-1 text-faint">Console</p>
        <h1 className="t-h2 text-ink">Moderation</h1>
        <p className="t-prose mt-2 max-w-2xl text-soft">
          Every action is recorded against your name. Hiding keeps content recoverable; removing does not.
        </p>
      </header>

      <Tabs
        activeKey={tab}
        items={[
          { key: 'open', label: 'Open reports', href: '/admin/moderation', count: reports.length },
          { key: 'lostfound', label: 'Lost & found', href: '/admin/moderation?tab=lostfound', count: pendingListings.total },
          { key: 'resolved', label: 'Resolved', href: '/admin/moderation?tab=resolved' },
        ]}
      />

      {tab === 'lostfound' ? (
        pendingListings.items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No listings waiting"
            description="Lost & found submissions appear here for approval before students can see them."
          />
        ) : (
          <LostFoundQueue items={pendingListings.items} />
        )
      ) : shown.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={tab === 'resolved' ? 'Nothing resolved yet' : 'The queue is empty'}
          description={
            tab === 'resolved'
              ? 'Resolved reports will be listed here with the note the moderator left.'
              : 'No open reports. Students can report any post, comment, thread, listing, paper or ad.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((report) => (
            <li key={report.id}>
              <ModerationCard report={report} readOnly={tab === 'resolved'} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
