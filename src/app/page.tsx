import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, FileText, LibraryBig, Sparkles, Users } from 'lucide-react';
import { CommandCentre } from '@/components/home/hero';
import { LandingHero } from '@/components/home/landing-hero';
import { ScrollRail } from '@/components/home/scroll-rail';
import { PostCard } from '@/components/content/post-card';
import { EventCard } from '@/components/content/event-card';
import { ClubCard } from '@/components/content/club-card';
import { OpportunityCard } from '@/components/content/opportunity-card';
import { AdSlot } from '@/components/content/ad-slot';
import { Section } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedCardSkeleton, EventCardSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCount } from '@/lib/format';
import { getSessionUser } from '@/server/auth/session';
import { listImportantPosts, listPosts } from '@/server/db/repositories/posts';
import { listEvents, listTodayEvents } from '@/server/db/repositories/events';
import { listClubs, listRecruitingClubs } from '@/server/db/repositories/clubs';
import { listLocations, listOpportunities, pyqBranchSummary } from '@/server/db/repositories/catalog';
import { bookmarkedIds, listFollowedClubIds } from '@/server/db/repositories/engagement';
import { makeContext } from '@/lib/ranking';
import type { RankingContext } from '@/lib/ranking';

/**
 * Home.
 *
 * Personalised when signed in: the feed, the events strip and the opportunity
 * rail are all ranked through `makeContext`, which folds in followed clubs,
 * declared interests, branch and year. Anonymous visitors get the same surfaces
 * ranked on recency, importance and popularity alone.
 */

export const revalidate = 120;

export default async function HomePage() {
  const now = new Date();
  const user = await getSessionUser();

  const followedClubIds = await listFollowedClubIds(user?.id ?? null);
  const context: RankingContext = makeContext({
    now: now.getTime(),
    followedClubIds: new Set(followedClubIds),
    interests: new Set((user?.interests ?? []).map((i) => i.toLowerCase())),
    branch: user?.branch ?? null,
    year: user?.year ?? null,
  });

  const [
    today, important, feed, upcoming, recruiting, opportunities, branches, allClubs,
    bookmarkedPosts, bookmarkedEvents, bookmarkedOpps, locations,
  ] = await Promise.all([
    listTodayEvents(6),
    listImportantPosts(3),
    listPosts({ pageSize: 8, rankFor: context }),
    listEvents({ window: 'upcoming', pageSize: 6, rankFor: context }),
    listRecruitingClubs(4),
    listOpportunities({ pageSize: 4, rankFor: context }),
    pyqBranchSummary(),
    listClubs({ pageSize: 1 }),
    bookmarkedIds(user?.id ?? null, 'POST'),
    bookmarkedIds(user?.id ?? null, 'EVENT'),
    bookmarkedIds(user?.id ?? null, 'OPPORTUNITY'),
    listLocations(),
  ]);

  const urgent = important.find((p) => p.importance === 'URGENT') ?? null;
  const signedIn = Boolean(user);
  const totalPapers = branches.reduce((sum, b) => sum + b.papers, 0);

  const greeting = user
    ? followedClubIds.length > 0
      ? `Welcome back, ${user.displayName.split(' ')[0]}. Your feed is ranked around the ${followedClubIds.length} club${followedClubIds.length === 1 ? '' : 's'} you follow.`
      : `Welcome back, ${user.displayName.split(' ')[0]}. Follow a few clubs to shape this feed around what you care about.`
    : null;

  const stats = {
    events: upcoming.total,
    clubs: allClubs.total,
    papers: totalPapers,
    opportunities: opportunities.total,
  };

  return (
    <>
      {/* The banner is the masthead; the command centre below it answers "what
          is happening right now". Both show for everyone — a signed-in student
          still gets the live schedule one scroll down. */}
      <LandingHero stats={stats} signedIn={signedIn} />

      <CommandCentre today={today} urgent={urgent} now={now} greeting={greeting} stats={stats} />

      <div className="mx-auto max-w-[var(--content-max)] px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={null}>
          <AdSlot placement="HOME_BANNER" variant="banner" className="mb-9" />
        </Suspense>

        {/* ------------------------------------------------- important today */}
        {important.length > 0 && (
          <Section
            eyebrow="Do not miss"
            title="Important today"
            description="Announcements the campus flagged as needing attention."
            className="mb-10"
            action={
              <Button size="sm" variant="ghost" asChild>
                <Link href="/news?importance=IMPORTANT">
                  All notices
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              {important.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  bookmarked={bookmarkedPosts.has(post.id)}
                  signedIn={signedIn}
                  now={now.getTime()}
                />
              ))}
            </div>
          </Section>
        )}

        {/* --------------------------------------------------- main columns */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="min-w-0">
            <Section
              eyebrow="The feed"
              title="Campus Pulse"
              description={
                signedIn
                  ? 'Ranked for you from recency, importance, your followed clubs and your interests.'
                  : 'Everything happening across campus, newest and most important first.'
              }
              action={
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/news">
                    All news
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              }
            >
              <Suspense fallback={<FeedSkeletonGrid />}>
                {feed.items.length === 0 ? (
                  <EmptyState
                    title="The feed is empty"
                    description="Nothing has been published yet. Check back shortly, or browse events and clubs in the meantime."
                    action={
                      <Button size="sm" variant="secondary" asChild>
                        <Link href="/events">Browse events</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {feed.items.map((post, index) => (
                      <div key={post.id}>
                        <PostCard
                          post={post}
                          variant={index === 0 ? 'lead' : 'default'}
                          bookmarked={bookmarkedPosts.has(post.id)}
                          signedIn={signedIn}
                          now={now.getTime()}
                        />
                        {index === 2 && (
                          <Suspense fallback={null}>
                            <AdSlot placement="FEED_PROMOTED" variant="inline" className="mt-3" />
                          </Suspense>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Suspense>

              {feed.hasMore && (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href="/news">
                      Load the full feed
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              )}
            </Section>
          </div>

          {/* ------------------------------------------------------ sidebar */}
          <aside className="min-w-0 space-y-8 lg:sticky lg:top-4 lg:self-start">
            <SidebarPanel
              title="Coming up"
              href="/events"
              linkLabel="All events"
              empty="No upcoming events yet."
            >
              {upcoming.items.slice(0, 5).map((event) => (
                <EventCard key={event.id} event={event} variant="mini" now={now.getTime()} />
              ))}
            </SidebarPanel>

            <SidebarPanel
              title="Closing soon"
              href="/opportunities?filter=closing-soon"
              linkLabel="All opportunities"
              empty="No deadlines in the next few days."
            >
              {opportunities.items.slice(0, 4).map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  variant="mini"
                  now={now.getTime()}
                  signedIn={signedIn}
                  bookmarked={bookmarkedOpps.has(opportunity.id)}
                />
              ))}
            </SidebarPanel>

            <Suspense fallback={null}>
              <AdSlot placement="SIDEBAR" variant="card" />
            </Suspense>

            <SidebarPanel
              title="Recruiting now"
              href="/clubs?recruitment=OPEN"
              linkLabel="All clubs"
              empty="No clubs are recruiting right now."
            >
              {recruiting.map((club) => (
                <ClubCard key={club.id} club={club} variant="row" signedIn={signedIn} />
              ))}
            </SidebarPanel>
          </aside>
        </div>

        {/* ---------------------------------------------------- events strip */}
        <Section
          eyebrow="Plan your week"
          title="Upcoming events"
          description="Workshops, contests, guest lectures and everything the clubs are running."
          className="mt-12"
          action={
            <Button size="sm" variant="ghost" asChild>
              <Link href="/events">
                Full calendar
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          <Suspense fallback={<EventSkeletonGrid />}>
            {upcoming.items.length === 0 ? (
              <EmptyState
                title="No upcoming events"
                description="Once clubs publish their schedules they will show up here."
                action={
                  <Button size="sm" variant="secondary" asChild>
                    <Link href="/events?window=past">See past events</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.items.slice(0, 6).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    bookmarked={bookmarkedEvents.has(event.id)}
                    signedIn={signedIn}
                    now={now.getTime()}
                  />
                ))}
              </div>
            )}
          </Suspense>
        </Section>

        {/* ----------------------------------------------------- quick links */}
        <Section eyebrow="Student toolkit" title="Everything else you need" className="mt-12">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ToolCard
              href="/pyqs"
              icon={FileText}
              title="PYQ Hub"
              description="Previous year papers by branch, semester and course."
              stat={`${formatCount(totalPapers)} papers`}
            />
            <ToolCard
              href="/clubs"
              icon={Users}
              title="Club directory"
              description="Every registered club and chapter, with recruitment status."
              stat={`${formatCount(allClubs.total)} clubs`}
            />
            <ToolCard
              href="/opportunities"
              icon={Sparkles}
              title="Opportunities"
              description="Internships, scholarships, hackathons and campus jobs."
              stat={`${formatCount(opportunities.total)} open`}
            />
            <ToolCard
              href="/resources"
              icon={LibraryBig}
              title="Resources"
              description="Calendars, forms, portals, handbooks and emergency contacts."
              stat="Searchable"
            />
          </div>

          {branches.length > 0 && (
            <div className="mt-4 rounded-md border border-line bg-primary p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                Jump into papers by branch
              </p>
              <div className="flex flex-wrap gap-1.5">
                {branches.slice(0, 10).map((branch) => (
                  <Link
                    key={branch.branch}
                    href={`/pyqs/${branch.branch.toLowerCase()}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-primary px-3 py-1.5 text-[12.5px] font-medium text-soft transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {branch.branch}
                    <span className="vp-numeric text-[11px] text-faint">{branch.papers}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* --------------------------------------------------- clubs preview */}
        <Section
          eyebrow="Get involved"
          title="Clubs recruiting this month"
          description="Open recruitment closes fast. Talk to people before you fill in a form."
          className="mt-12"
          action={
            <Button size="sm" variant="ghost" asChild>
              <Link href="/clubs">
                All clubs
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {recruiting.length === 0 ? (
            <EmptyState
              title="No open recruitment"
              description="Clubs usually open recruitment at the start of a semester. Follow a few to be notified."
              action={
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/clubs">Browse the directory</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recruiting.map((club) => (
                <ClubCard key={club.id} club={club} signedIn={signedIn} following={followedClubIds.includes(club.id)} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* The side-scrolling tour closes the page: by here a visitor has seen
          the live surfaces, and this is what else is behind them. */}
      <ScrollRail stats={{ ...stats, locations: locations.length }} />
    </>
  );
}

function SidebarPanel({
  title, href, linkLabel, children, empty,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
  empty: string;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.filter(Boolean).length > 0;

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-line-strong pb-2">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink">{title}</h2>
        <Link
          href={href}
          className="text-[11.5px] font-medium text-muted transition-colors hover:text-ink hover:underline underline-offset-2"
        >
          {linkLabel}
        </Link>
      </div>
      {hasItems ? <div>{children}</div> : <p className="py-4 text-[12.5px] text-faint">{empty}</p>}
    </section>
  );
}

function ToolCard({
  href, icon: Icon, title, description, stat,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  description: string;
  stat: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-md border border-line bg-primary p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm"
    >
      <span className="mb-3 inline-flex size-8 items-center justify-center rounded-sm border border-line bg-tertiary text-muted transition-colors group-hover:border-brand group-hover:bg-brand-soft group-hover:text-brand-ink">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-[14.5px] font-semibold text-ink">{title}</span>
      <span className="mt-1 flex-1 text-[12.5px] leading-relaxed text-muted">{description}</span>
      <span className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
        <Badge tone="outline" size="xs">{stat}</Badge>
        <ArrowRight
          className="ml-auto size-3.5 -translate-x-1 text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function FeedSkeletonGrid() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <FeedCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EventSkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
