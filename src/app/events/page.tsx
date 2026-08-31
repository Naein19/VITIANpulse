import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, CalendarRange, LayoutGrid, ListOrdered } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { EventCard } from '@/components/content/event-card';
import { CalendarView } from '@/components/events/calendar-view';
import { TimelineView } from '@/components/events/timeline-view';
import { EventFilters } from '@/components/events/event-filters';
import { SegmentedControl, FilterChips } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/content/ad-slot';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { EVENT_CATEGORIES, SCHOOLS, type EventCategory, type School } from '@/types/domain';
import { listEvents, listEventsInMonth } from '@/server/db/repositories/events';
import { listClubs } from '@/server/db/repositories/clubs';
import { bookmarkedIds, listFollowedClubIds } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { makeContext } from '@/lib/ranking';
import { enumParam, hrefBuilder, intParam, optionalEnumParam, param, type SearchParams } from '@/lib/query-params';
import type { EventWindow } from '@/server/db/repositories/events';

/**
 * Event discovery.
 *
 * Three views over the same filtered query — list, calendar and timeline — with
 * every filter in the URL so any view is shareable exactly as seen.
 */

export const revalidate = 120;

export const metadata: Metadata = pageMetadata({
  title: 'Events',
  description:
    'Workshops, hackathons, guest lectures, competitions, cultural nights and club recruitment at VIT-AP. Filter by category, club, school and date.',
  path: '/events',
});

const PAGE_SIZE = 12;
const VIEWS = ['list', 'calendar', 'timeline'] as const;
const WINDOWS = ['upcoming', 'today', 'week', 'past', 'all'] as const;

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const now = new Date();

  const view = enumParam(params, 'view', VIEWS, 'list');
  const window = enumParam<EventWindow>(params, 'window', WINDOWS, 'upcoming');
  const category = enumParam<EventCategory | 'ALL'>(params, 'category', [...EVENT_CATEGORIES, 'ALL'], 'ALL');
  const school = optionalEnumParam<School>(params, 'school', SCHOOLS);
  const clubId = param(params, 'club');
  const search = param(params, 'q');
  const free = param(params, 'free');
  const registration = param(params, 'registration');
  const page = intParam(params, 'page', 1);
  const year = intParam(params, 'year', now.getFullYear());
  const month = params.month !== undefined ? intParam(params, 'month', now.getMonth()) : now.getMonth();

  const user = await getSessionUser();
  const followedClubIds = await listFollowedClubIds(user?.id ?? null);

  const baseQuery = {
    window,
    ...(category !== 'ALL' ? { category } : {}),
    ...(school ? { school } : {}),
    ...(clubId ? { clubId } : {}),
    ...(search ? { search } : {}),
    ...(free === 'true' ? { free: true } : free === 'false' ? { free: false } : {}),
    ...(registration === 'required'
      ? { registrationRequired: true }
      : registration === 'open'
        ? { registrationRequired: false }
        : {}),
  };

  const [listResult, monthEvents, timelineResult, clubs, bookmarks] = await Promise.all([
    view === 'list'
      ? listEvents({
          ...baseQuery,
          page,
          pageSize: PAGE_SIZE,
          ...(user
            ? {
                rankFor: makeContext({
                  followedClubIds: new Set(followedClubIds),
                  interests: new Set(user.interests.map((i) => i.toLowerCase())),
                  branch: user.branch,
                  year: user.year,
                }),
              }
            : {}),
        })
      : Promise.resolve(null),
    view === 'calendar' ? listEventsInMonth(year, month) : Promise.resolve([]),
    view === 'timeline' ? listEvents({ ...baseQuery, pageSize: 40 }) : Promise.resolve(null),
    listClubs({ pageSize: 60, sort: 'name' }),
    bookmarkedIds(user?.id ?? null, 'EVENT'),
  ]);

  const buildHref = hrefBuilder('/events', params, {
    defaults: { view: 'list', window: 'upcoming', category: 'ALL', page: '1' },
  });

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Events"
        description="Everything running on campus — workshops, contests, guest lectures, matches and recruitment drives."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Events' }]}
        action={
          <>
            <SearchField placeholder="Search events…" defaultValue={search ?? ''} basePath="/events" />
            <SegmentedControl
              activeKey={view}
              items={[
                { key: 'list', label: 'List', href: buildHref({ view: 'list' }), icon: <LayoutGrid className="size-3.5" aria-hidden="true" /> },
                { key: 'calendar', label: 'Calendar', href: buildHref({ view: 'calendar' }), icon: <CalendarRange className="size-3.5" aria-hidden="true" /> },
                { key: 'timeline', label: 'Timeline', href: buildHref({ view: 'timeline' }), icon: <ListOrdered className="size-3.5" aria-hidden="true" /> },
              ]}
            />
          </>
        }
      >
        <div className="space-y-2">
          <FilterChips
            label="Time window"
            activeKey={window}
            items={[
              { key: 'upcoming', label: 'Upcoming', href: buildHref({ window: 'upcoming' }) },
              { key: 'today', label: 'Today', href: buildHref({ window: 'today' }) },
              { key: 'week', label: 'This week', href: buildHref({ window: 'week' }) },
              { key: 'past', label: 'Past', href: buildHref({ window: 'past' }) },
              { key: 'all', label: 'All time', href: buildHref({ window: 'all' }) },
            ]}
          />
          <FilterChips
            label="Category"
            activeKey={category}
            items={[
              { key: 'ALL', label: 'All types', href: buildHref({ category: 'ALL' }) },
              ...EVENT_CATEGORIES.map((c) => ({ key: c, label: humanise(c), href: buildHref({ category: c }) })),
            ]}
          />
        </div>
      </PageHeader>

      <PageBody>
        <div className="grid gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <EventFilters
            clubs={clubs.items.map((c) => ({ id: c.id, name: c.name }))}
            current={{
              school: school ?? '',
              club: clubId ?? '',
              free: free ?? '',
              registration: registration ?? '',
            }}
            params={params}
          />

          <div className="min-w-0">
            {view === 'calendar' && (
              <>
                <CalendarView events={monthEvents} year={year} month={month} buildHref={buildHref} today={now} />
                <p className="mt-3 text-[12px] text-faint">
                  The calendar shows every published event in the month, ignoring the time-window filter.
                </p>
              </>
            )}

            {view === 'timeline' &&
              (timelineResult && timelineResult.items.length > 0 ? (
                <TimelineView events={timelineResult.items} today={now} />
              ) : (
                <NoEvents window={window} />
              ))}

            {view === 'list' &&
              (listResult && listResult.items.length > 0 ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {listResult.items.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        bookmarked={bookmarks.has(event.id)}
                        signedIn={Boolean(user)}
                        now={now.getTime()}
                      />
                    ))}
                  </div>
                  <AdSlot placement="EVENTS_PROMO" variant="inline" className="mt-5" />
                  <Pagination
                    className="mt-6"
                    page={listResult.page}
                    pageSize={listResult.pageSize}
                    total={listResult.total}
                    buildHref={(p) => buildHref({ page: p })}
                    itemLabel="events"
                  />
                </>
              ) : (
                <NoEvents window={window} />
              ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function NoEvents({ window }: { window: EventWindow }) {
  return (
    <EmptyState
      icon={CalendarDays}
      title={window === 'past' ? 'No past events match these filters' : 'No events match these filters'}
      description={
        window === 'today'
          ? 'Nothing is scheduled for today with these filters. Try the week view or clear the filters.'
          : 'Try widening the time window, choosing a different category, or clearing the filters.'
      }
      action={
        <>
          <Button size="sm" variant="primary" asChild>
            <Link href="/events">Clear all filters</Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link href="/clubs?recruitment=OPEN">Browse clubs instead</Link>
          </Button>
        </>
      }
    />
  );
}
