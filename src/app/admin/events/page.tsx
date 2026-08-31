import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Badge, EventCategoryBadge } from '@/components/ui/badge';
import { Table, Th, Td, Tr, DataList, DataListRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { FilterChips } from '@/components/ui/tabs';
import { StatusActions } from '@/components/admin/status-actions';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { formatDateTime, humanise } from '@/lib/format';
import { requirePagePermission } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { listEvents } from '@/server/db/repositories/events';
import { CONTENT_STATUSES, type ContentStatus } from '@/types/domain';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/** Event review queue. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Events',
  description: 'Event review queue.',
  path: '/admin/events',
  noIndex: true,
});

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePagePermission('event:edit:any');
  const params = await searchParams;
  const status = enumParam<ContentStatus | 'ALL'>(params, 'status', [...CONTENT_STATUSES, 'ALL'], 'ALL');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const result = await listEvents({
    page,
    pageSize: 20,
    window: 'all',
    status,
    ...(search ? { search } : {}),
  });

  const buildHref = hrefBuilder('/admin/events', params, { defaults: { status: 'ALL', page: '1' } });
  const canPublish = can(user.role, 'event:publish');
  const canDelete = can(user.role, 'event:delete');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow mb-1 text-faint">Console</p>
          <h1 className="t-h2 text-ink">Events</h1>
          <p className="t-prose mt-2 max-w-2xl text-soft">
            Publishing a club event notifies its followers and makes it registrable.
          </p>
        </div>
        <SearchField placeholder="Search events…" defaultValue={search ?? ''} basePath="/admin/events" />
      </header>

      <FilterChips
        label="Status"
        activeKey={status}
        items={[
          { key: 'ALL', label: 'All', href: buildHref({ status: 'ALL' }) },
          ...CONTENT_STATUSES.map((s) => ({ key: s, label: humanise(s), href: buildHref({ status: s }) })),
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events in this queue" description="Submitted and draft events appear here." />
      ) : (
        <>
          <div className="hidden md:block">
            <Table caption="Events awaiting review">
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Category</Th>
                  <Th>Starts</Th>
                  <Th>Seats</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((event) => (
                  <Tr key={event.id}>
                    <Td>
                      <Link
                        href={`/events/${event.slug}`}
                        className="text-[13px] font-semibold text-ink hover:underline underline-offset-2"
                      >
                        {event.title}
                      </Link>
                      <p className="mt-0.5 text-[11.5px] text-faint">
                        {event.club?.shortName ?? event.organiser} · {event.venue}
                      </p>
                    </Td>
                    <Td><EventCategoryBadge category={event.category} /></Td>
                    <Td className="text-[12px] text-muted">{formatDateTime(event.startsAt)}</Td>
                    <Td className="vp-numeric text-[12.5px]">
                      {event.seats === null ? '—' : `${event.seatsTaken}/${event.seats}`}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          event.status === 'PUBLISHED' ? 'success'
                          : event.status === 'PENDING_REVIEW' ? 'warning'
                          : event.status === 'REJECTED' ? 'danger' : 'neutral'
                        }
                        size="xs"
                      >
                        {humanise(event.status)}
                      </Badge>
                    </Td>
                    <Td>
                      <StatusActions
                        kind="event"
                        id={event.id}
                        status={event.status}
                        canPublish={canPublish}
                        canDelete={canDelete}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          <DataList className="md:hidden">
            {result.items.map((event) => (
              <DataListRow
                key={event.id}
                title={event.title}
                subtitle={`${event.club?.shortName ?? event.organiser} · ${formatDateTime(event.startsAt)}`}
                meta={
                  <>
                    <EventCategoryBadge category={event.category} />
                    <Badge tone={event.status === 'PUBLISHED' ? 'success' : 'warning'} size="xs">
                      {humanise(event.status)}
                    </Badge>
                  </>
                }
                action={
                  <StatusActions
                    kind="event"
                    id={event.id}
                    status={event.status}
                    canPublish={canPublish}
                    canDelete={canDelete}
                  />
                }
              />
            ))}
          </DataList>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            buildHref={(p) => buildHref({ page: p })}
            itemLabel="events"
          />
        </>
      )}
    </div>
  );
}
