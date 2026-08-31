import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/content/post-card';
import { EventCard } from '@/components/content/event-card';
import { ClubCard } from '@/components/content/club-card';
import { OpportunityCard } from '@/components/content/opportunity-card';
import { ResourceLink } from '@/components/content/resource-link';
import { PaperRow } from '@/components/pyq/paper-row';
import { pageMetadata } from '@/lib/metadata';
import { getSessionUser } from '@/server/auth/session';
import { countBookmarksByType, listBookmarks, listFollowedClubIds } from '@/server/db/repositories/engagement';
import { getPostsByIds } from '@/server/db/repositories/posts';
import { getEventsByIds } from '@/server/db/repositories/events';
import { getClubsByIds } from '@/server/db/repositories/clubs';
import { getOpportunitiesByIds, getPyqPapersByIds, getResourcesByIds } from '@/server/db/repositories/catalog';
import { enumParam, type SearchParams } from '@/lib/query-params';
import { BOOKMARK_TYPES, type BookmarkType } from '@/types/domain';

/** Everything the student has bookmarked, grouped by kind. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Saved',
  description: 'Everything you have bookmarked on VITPulse.',
  path: '/saved',
  noIndex: true,
});

const EMPTY_COPY: Record<BookmarkType, { title: string; description: string; href: string; cta: string }> = {
  EVENT: { title: 'No saved events', description: 'Bookmark an event and it will appear here, ready to add to your calendar.', href: '/events', cta: 'Browse events' },
  POST: { title: 'No saved stories', description: 'Save an announcement or story to come back to it later.', href: '/news', cta: 'Read the feed' },
  CLUB: { title: 'No saved clubs', description: 'Following a club puts its events in your feed; bookmarking keeps it in this list.', href: '/clubs', cta: 'Browse clubs' },
  PYQ: { title: 'No saved papers', description: 'Bookmark question papers while you revise so they are one click away.', href: '/pyqs', cta: 'Open PYQ Hub' },
  OPPORTUNITY: { title: 'No saved opportunities', description: 'Save an internship or scholarship to track its deadline.', href: '/opportunities', cta: 'Find opportunities' },
  RESOURCE: { title: 'No saved resources', description: 'Bookmark the forms and portals you use often.', href: '/resources', cta: 'Browse resources' },
};

export default async function SavedPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/saved');

  const params = await searchParams;
  const tab = enumParam<BookmarkType>(params, 'type', BOOKMARK_TYPES, 'EVENT');

  const [counts, bookmarks, followed] = await Promise.all([
    countBookmarksByType(user.id),
    listBookmarks(user.id, tab),
    listFollowedClubIds(user.id),
  ]);

  const ids = bookmarks.map((b) => b.targetId);
  const [posts, events, clubs, papers, opportunities, resources] = await Promise.all([
    tab === 'POST' ? getPostsByIds(ids) : Promise.resolve([]),
    tab === 'EVENT' ? getEventsByIds(ids) : Promise.resolve([]),
    tab === 'CLUB' ? getClubsByIds(ids) : Promise.resolve([]),
    tab === 'PYQ' ? getPyqPapersByIds(ids) : Promise.resolve([]),
    tab === 'OPPORTUNITY' ? getOpportunitiesByIds(ids) : Promise.resolve([]),
    tab === 'RESOURCE' ? getResourcesByIds(ids) : Promise.resolve([]),
  ]);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const bookmarkedSet = new Set(ids);
  const now = Date.now();
  const empty = EMPTY_COPY[tab];

  return (
    <>
      <PageHeader
        eyebrow="Your library"
        title="Saved"
        description={
          total > 0
            ? `${total} bookmarked ${total === 1 ? 'item' : 'items'} across VITPulse.`
            : 'Bookmark anything on VITPulse and it collects here.'
        }
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Saved' }]}
      >
        <Tabs
          activeKey={tab}
          items={BOOKMARK_TYPES.map((type) => ({
            key: type,
            label: type === 'PYQ' ? 'PYQs' : `${type.charAt(0)}${type.slice(1).toLowerCase()}s`,
            href: `/saved?type=${type}`,
            count: counts[type],
          }))}
        />
      </PageHeader>

      <PageBody>
        {bookmarks.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={empty.title}
            description={empty.description}
            action={
              <Button size="sm" variant="primary" asChild>
                <Link href={empty.href}>{empty.cta}</Link>
              </Button>
            }
          />
        ) : (
          <>
            {tab === 'EVENT' && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} bookmarked signedIn now={now} />
                ))}
              </div>
            )}
            {tab === 'POST' && (
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} bookmarked signedIn now={now} />
                ))}
              </div>
            )}
            {tab === 'CLUB' && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {clubs.map((club) => (
                  <ClubCard key={club.id} club={club} signedIn following={followed.includes(club.id)} />
                ))}
              </div>
            )}
            {tab === 'PYQ' && (
              <ul className="divide-y divide-line rounded-md border border-line bg-primary">
                {papers.map((paper) => (
                  <PaperRow key={paper.id} paper={paper} bookmarked signedIn />
                ))}
              </ul>
            )}
            {tab === 'OPPORTUNITY' && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {opportunities.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} bookmarked signedIn now={now} />
                ))}
              </div>
            )}
            {tab === 'RESOURCE' && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {resources.map((resource) => (
                  <ResourceLink key={resource.id} resource={resource} bookmarked={bookmarkedSet.has(resource.id)} signedIn />
                ))}
              </ul>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
