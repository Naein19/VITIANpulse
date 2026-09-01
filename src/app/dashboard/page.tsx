import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight, Bookmark, CalendarCheck, CalendarDays, Sparkles, Ticket, Users,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Alert, Stat } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { EventCard } from '@/components/content/event-card';
import { PostCard } from '@/components/content/post-card';
import { OpportunityCard } from '@/components/content/opportunity-card';
import { ClubCard } from '@/components/content/club-card';
import { CalendarPanel } from '@/components/campus/calendar-panel';
import { pageMetadata } from '@/lib/metadata';
import { formatRelative } from '@/lib/format';
import { getSessionUser } from '@/server/auth/session';
import {
  countBookmarksByType, listBookmarks, listFollowedClubIds, listNotifications, listRegistrations,
} from '@/server/db/repositories/engagement';
import { getClubsByIds } from '@/server/db/repositories/clubs';
import { getEventsByIds, listEvents } from '@/server/db/repositories/events';
import { listPosts } from '@/server/db/repositories/posts';
import { getOpportunitiesByIds, listOpportunities } from '@/server/db/repositories/catalog';
import { makeContext } from '@/lib/ranking';

/**
 * My VITPulse — the personalised hub.
 *
 * Everything here is derived from real state: clubs the student follows, seats
 * they hold, things they bookmarked, and their branch/year/interests feeding the
 * same deterministic ranking used by the public feed.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'My VITPulse',
  description: 'Your followed clubs, saved events, registrations, deadlines and recommendations.',
  path: '/dashboard',
  noIndex: true,
});

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/dashboard');

  const now = Date.now();
  const followedClubIds = await listFollowedClubIds(user.id);
  const context = makeContext({
    now,
    followedClubIds: new Set(followedClubIds),
    interests: new Set(user.interests.map((i) => i.toLowerCase())),
    branch: user.branch,
    year: user.year,
  });

  const [
    registrations, followedClubs, bookmarkCounts, savedEventBookmarks, savedOppBookmarks,
    recommendedEvents, clubFeed, deadlines, notifications,
  ] = await Promise.all([
    listRegistrations(user.id),
    getClubsByIds(followedClubIds),
    countBookmarksByType(user.id),
    listBookmarks(user.id, 'EVENT'),
    listBookmarks(user.id, 'OPPORTUNITY'),
    listEvents({ window: 'upcoming', pageSize: 6, rankFor: context }),
    followedClubIds.length > 0
      ? listPosts({ pageSize: 5, rankFor: context })
      : listPosts({ pageSize: 5 }),
    listOpportunities({ pageSize: 5, rankFor: context }),
    listNotifications(user.id, 5),
  ]);

  const [registeredEvents, savedEvents, savedOpportunities] = await Promise.all([
    getEventsByIds(registrations.map((r) => r.eventId)),
    getEventsByIds(savedEventBookmarks.map((b) => b.targetId)),
    getOpportunitiesByIds(savedOppBookmarks.map((b) => b.targetId)),
  ]);

  const upcomingRegistered = registeredEvents
    .filter((e) => Date.parse(e.endsAt) >= now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const savedUpcoming = savedEvents
    .filter((e) => Date.parse(e.endsAt) >= now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const savedBookmarkIds = new Set(savedEventBookmarks.map((b) => b.targetId));
  const savedOppIds = new Set(savedOppBookmarks.map((b) => b.targetId));
  const totalSaved = Object.values(bookmarkCounts).reduce((sum, n) => sum + n, 0);
  const unread = notifications.filter((n) => !n.readAt).length;

  const profileIncomplete = !user.branch || !user.year || user.interests.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={`Signed in as ${user.role.replace(/_/g, ' ').toLowerCase()}`}
        title={`Welcome back, ${user.displayName.split(' ')[0]}`}
        description={
          followedClubIds.length > 0
            ? `Your feed is ranked around ${followedClubIds.length} followed ${followedClubIds.length === 1 ? 'club' : 'clubs'}${user.branch ? `, ${user.branch}` : ''}${user.year ? ` year ${user.year}` : ''}.`
            : 'Follow a few clubs and set your interests to shape everything you see.'
        }
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'My VITPulse' }]}
        action={
          <>
            <Button variant="secondary" asChild>
              <Link href="/saved">
                <Bookmark className="size-3.5" aria-hidden="true" />
                Saved ({totalSaved})
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/profile">Edit profile</Link>
            </Button>
          </>
        }
      />

      <PageBody>
        {profileIncomplete && (
          <Alert
            tone="info"
            className="mb-6"
            title="Finish your profile to get better recommendations"
            action={
              <Button size="sm" variant="primary" asChild>
                <Link href="/profile">Complete profile</Link>
              </Button>
            }
          >
            Setting your branch, year and interests lets VITPulse filter opportunities you are actually eligible for and
            rank events you would care about.
          </Alert>
        )}

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Registered" value={upcomingRegistered.length} hint="Upcoming events you hold a seat for" tone="brand" />
          <Stat label="Following" value={followedClubs.length} hint="Clubs shaping your feed" />
          <Stat label="Saved" value={totalSaved} hint="Bookmarked across the platform" />
          <Stat label="Unread" value={unread} hint="Notifications waiting" tone={unread > 0 ? 'danger' : 'default'} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-10">
            <Panel
              title="Your next events"
              icon={CalendarCheck}
              href="/events"
              linkLabel="All events"
              empty={
                <EmptyState
                  icon={Ticket}
                  compact
                  title="No registrations yet"
                  description="Register for an event and it will appear here with a reminder."
                  action={
                    <Button size="sm" variant="primary" asChild>
                      <Link href="/events">Find something to attend</Link>
                    </Button>
                  }
                />
              }
              isEmpty={upcomingRegistered.length === 0}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {upcomingRegistered.slice(0, 4).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    bookmarked={savedBookmarkIds.has(event.id)}
                    signedIn
                    now={now}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title="Recommended for you"
              icon={Sparkles}
              href="/events"
              linkLabel="Browse all"
              isEmpty={recommendedEvents.items.length === 0}
              empty={
                <EmptyState compact title="Nothing to recommend yet" description="Once events are published they will be ranked for you here." />
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendedEvents.items.slice(0, 4).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    bookmarked={savedBookmarkIds.has(event.id)}
                    signedIn
                    now={now}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title={followedClubIds.length > 0 ? 'From clubs you follow' : 'Campus feed'}
              icon={Users}
              href="/news"
              linkLabel="Full feed"
              isEmpty={clubFeed.items.length === 0}
              empty={<EmptyState compact title="Nothing published yet" description="Updates will appear here." />}
            >
              <div className="space-y-3">
                {clubFeed.items.slice(0, 4).map((post) => (
                  <PostCard key={post.id} post={post} signedIn now={now} />
                ))}
              </div>
            </Panel>
          </div>

          {/* ---------------------------------------------------- side rail */}
          <aside className="min-w-0 space-y-7 lg:sticky lg:top-4 lg:self-start">
            <CalendarPanel year={user.year} />

            <SideBlock title="Deadlines" href="/opportunities?filter=closing-soon" linkLabel="All">
              {deadlines.items.length === 0 ? (
                <p className="py-3 text-[12.5px] text-faint">Nothing closing soon.</p>
              ) : (
                <ul className="space-y-0">
                  {deadlines.items.slice(0, 5).map((opportunity) => (
                    <li key={opportunity.id}>
                      <OpportunityCard
                        opportunity={opportunity}
                        variant="mini"
                        now={now}
                        signedIn
                        bookmarked={savedOppIds.has(opportunity.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </SideBlock>

            <SideBlock title="Saved for later" href="/saved" linkLabel="Saved">
              {savedUpcoming.length === 0 && savedOpportunities.length === 0 ? (
                <p className="py-3 text-[12.5px] text-faint">You have not saved anything upcoming.</p>
              ) : (
                <ul>
                  {savedUpcoming.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} variant="mini" now={now} />
                    </li>
                  ))}
                </ul>
              )}
            </SideBlock>

            <SideBlock title="Following" href="/clubs" linkLabel="Directory">
              {followedClubs.length === 0 ? (
                <div className="py-3">
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    You are not following any clubs. Following one puts its events and updates at the top of your feed.
                  </p>
                  <Button size="sm" variant="secondary" className="mt-2.5" asChild>
                    <Link href="/clubs?recruitment=OPEN">
                      Find clubs
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div>
                  {followedClubs.slice(0, 6).map((club) => (
                    <ClubCard key={club.id} club={club} variant="row" following signedIn />
                  ))}
                </div>
              )}
            </SideBlock>

            <SideBlock title="Recent notifications" href="/notifications" linkLabel="All">
              {notifications.length === 0 ? (
                <p className="py-3 text-[12.5px] text-faint">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="py-2.5">
                      <Link href={notification.href ?? '/notifications'} className="group block">
                        <span className="flex items-start gap-2">
                          {!notification.readAt && (
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue" aria-hidden="true" />
                          )}
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-semibold leading-snug text-ink group-hover:underline underline-offset-2">
                              {notification.title}
                            </span>
                            <span className="mt-0.5 block text-[11.5px] text-faint">
                              {formatRelative(notification.createdAt, now)}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SideBlock>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function Panel({
  title, icon: Icon, href, linkLabel, children, isEmpty, empty,
}: {
  title: string;
  icon: typeof CalendarDays;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
  isEmpty: boolean;
  empty: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-2.5">
        <h2 className="flex items-center gap-2 t-h4 text-ink">
          <Icon className="size-4 text-faint" aria-hidden="true" />
          {title}
        </h2>
        <Link
          href={href}
          className="t-sm text-muted transition-colors hover:text-ink hover:underline underline-offset-2"
        >
          {linkLabel}
        </Link>
      </div>
      {isEmpty ? empty : children}
    </section>
  );
}

function SideBlock({
  title, href, linkLabel, children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-line-strong pb-2">
        <h2 className="t-label text-ink">{title}</h2>
        <Link
          href={href}
          className="text-[11.5px] font-medium text-muted transition-colors hover:text-ink hover:underline underline-offset-2"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}
