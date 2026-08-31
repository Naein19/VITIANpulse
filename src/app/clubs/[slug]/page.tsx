import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck, CalendarDays, DoorOpen, ExternalLink, Mail, MapPin, UserRound, Users,
} from 'lucide-react';
import { PageBody } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Alert, Avatar, Breadcrumbs, MetaRow, RichText } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { FollowButton } from '@/components/content/follow-button';
import { ShareButton } from '@/components/content/share-button';
import { ClubAvatar } from '@/components/content/club-card';
import { EventCard } from '@/components/content/event-card';
import { PostCard } from '@/components/content/post-card';
import { JsonLd } from '@/components/seo/json-ld';
import { organizationJsonLd, pageMetadata } from '@/lib/metadata';
import { formatCount, formatCountdown, humanise } from '@/lib/format';
import { getClubBySlug } from '@/server/db/repositories/clubs';
import { listEvents } from '@/server/db/repositories/events';
import { listPosts } from '@/server/db/repositories/posts';
import { bookmarkedIds, isFollowingClub } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { siteUrl } from '@/lib/env';
import { enumParam, type SearchParams } from '@/lib/query-params';

/** Club home: who they are, what is coming up, and how to join. */

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club || club.status !== 'PUBLISHED') {
    return pageMetadata({ title: 'Club not found', description: 'This club is not available.', path: `/clubs/${slug}`, noIndex: true });
  }
  return pageMetadata({
    title: club.name,
    description: club.tagline,
    path: `/clubs/${club.slug}`,
    image: club.bannerUrl,
  });
}

const TABS = ['upcoming', 'past', 'news', 'about'] as const;

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const club = await getClubBySlug(slug);
  if (!club || club.status !== 'PUBLISHED') notFound();

  const tab = enumParam(query, 'tab', TABS, 'upcoming');
  const user = await getSessionUser();
  const now = Date.now();

  const [upcoming, past, news, following, eventBookmarks, postBookmarks] = await Promise.all([
    listEvents({ clubId: club.id, window: 'upcoming', pageSize: 12 }),
    listEvents({ clubId: club.id, window: 'past', pageSize: 12 }),
    listPosts({ clubId: club.id, pageSize: 10 }),
    user ? isFollowingClub(user.id, club.id) : Promise.resolve(false),
    bookmarkedIds(user?.id ?? null, 'EVENT'),
    bookmarkedIds(user?.id ?? null, 'POST'),
  ]);

  const recruiting = club.recruitmentStatus === 'OPEN';
  const base = `/clubs/${club.slug}`;

  return (
    <>
      <JsonLd data={organizationJsonLd(club.name, club.tagline, `${siteUrl}${base}`)} />

      {/* ------------------------------------------------------------ banner */}
      <div className="relative overflow-hidden border-b border-line bg-canvas-alt">
        <div className="vp-dot-bg vp-fade-b pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative mx-auto max-w-[var(--vp-shell-max)] px-4 py-7 sm:px-6 sm:py-9">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Clubs', href: '/clubs' }, { label: club.name }]} />

          <div className="flex flex-wrap items-start gap-5">
            <ClubAvatar club={club} size="lg" />

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="outline" size="xs">{humanise(club.category)}</Badge>
                {club.school && <Badge tone="outline" size="xs">{club.school.replace(/_/g, ' ')}</Badge>}
                {recruiting && <Badge tone="pulse" size="xs" dot>Recruiting now</Badge>}
                {club.recruitmentStatus === 'UPCOMING' && <Badge tone="info" size="xs">Recruitment opening soon</Badge>}
              </div>

              <h1 className="flex flex-wrap items-center gap-2 text-[27px] leading-tight text-ink sm:text-[33px]">
                {club.name}
                {club.verified && (
                  <BadgeCheck className="size-5 shrink-0 text-brand" aria-label="Verified by the university" />
                )}
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{club.tagline}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-faint">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden="true" />
                  <span className="vp-numeric font-medium text-soft">{formatCount(club.followerCount)}</span> followers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  <span className="vp-numeric font-medium text-soft">{upcoming.total}</span> upcoming
                </span>
                {club.room && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {club.room}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <FollowButton clubId={club.id} initial={following} signedIn={Boolean(user)} size="md" />
              <ShareButton title={club.name} path={base} withLabel />
            </div>
          </div>

          <Tabs
            className="mt-6"
            activeKey={tab}
            items={[
              { key: 'upcoming', label: 'Upcoming', href: `${base}?tab=upcoming`, count: upcoming.total },
              { key: 'past', label: 'Past events', href: `${base}?tab=past`, count: past.total },
              { key: 'news', label: 'Updates', href: `${base}?tab=news`, count: news.total },
              { key: 'about', label: 'About', href: `${base}?tab=about` },
            ]}
          />
        </div>
      </div>

      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0">
            {recruiting && (
              <Alert tone="success" title="Recruitment is open" className="mb-5" action={
                club.recruitmentUrl ? (
                  <Button size="sm" variant="primary" asChild>
                    <a href={club.recruitmentUrl} target="_blank" rel="noopener noreferrer">
                      Apply
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : undefined
              }>
                {club.recruitmentClosesAt
                  ? `Applications close ${formatCountdown(club.recruitmentClosesAt, now).toLowerCase()}.`
                  : 'Applications are open now.'}
                {club.membershipInfo ? ` ${club.membershipInfo}` : ''}
              </Alert>
            )}

            {tab === 'upcoming' &&
              (upcoming.items.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcoming.items.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      bookmarked={eventBookmarks.has(event.id)}
                      signedIn={Boolean(user)}
                      now={now}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming events"
                  description={`${club.name} has not scheduled anything yet. Follow them to be notified when they do.`}
                  action={<FollowButton clubId={club.id} initial={following} signedIn={Boolean(user)} />}
                />
              ))}

            {tab === 'past' &&
              (past.items.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {past.items.map((event) => (
                    <EventCard key={event.id} event={event} signedIn={Boolean(user)} now={now} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalendarDays} title="No past events yet" description="Their event archive will build up here." />
              ))}

            {tab === 'news' &&
              (news.items.length > 0 ? (
                <div className="space-y-3">
                  {news.items.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      bookmarked={postBookmarks.has(post.id)}
                      signedIn={Boolean(user)}
                      now={now}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No updates published" description={`${club.name} has not posted an update on VITPulse yet.`} />
              ))}

            {tab === 'about' && (
              <div className="max-w-2xl">
                <h2 className="mb-3 border-b border-line pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
                  About {club.shortName}
                </h2>
                <RichText text={club.description} />

                {club.membershipInfo && (
                  <>
                    <h2 className="mb-3 mt-8 border-b border-line pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
                      Membership
                    </h2>
                    <RichText text={club.membershipInfo} />
                  </>
                )}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------- sidebar */}
          <aside className="min-w-0 space-y-6 lg:sticky lg:top-[calc(var(--vp-header-h)+16px)] lg:self-start">
            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Club details</h2>
              <dl className="divide-y divide-line">
                <MetaRow label="Category">{humanise(club.category)}</MetaRow>
                {club.school && <MetaRow label="School">{club.school.replace(/_/g, ' ')}</MetaRow>}
                <MetaRow label="Recruitment">
                  <span className={recruiting ? 'font-medium text-success-ink' : undefined}>
                    {humanise(club.recruitmentStatus)}
                  </span>
                </MetaRow>
                {club.facultyCoordinator && <MetaRow label="Faculty coordinator">{club.facultyCoordinator}</MetaRow>}
                {club.room && <MetaRow label="Club room">{club.room}</MetaRow>}
                <MetaRow label="Followers">
                  <span className="vp-numeric">{formatCount(club.followerCount)}</span>
                </MetaRow>
              </dl>

              {club.email && (
                <a
                  href={`mailto:${club.email}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand hover:underline underline-offset-2"
                >
                  <Mail className="size-3.5" aria-hidden="true" />
                  {club.email}
                </a>
              )}
            </section>

            {club.socialLinks.length > 0 && (
              <section className="rounded-md border border-line bg-surface p-4">
                <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Find them on</h2>
                <ul className="space-y-1">
                  {club.socialLinks.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center justify-between rounded-sm px-2 py-1.5 text-[13px] text-soft transition-colors hover:bg-canvas-alt hover:text-ink"
                      >
                        {humanise(link.platform)}
                        <ExternalLink className="size-3 text-faint" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {club.coordinators.length > 0 && (
              <section className="rounded-md border border-line bg-surface p-4">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                  Student coordinators
                </h2>
                <ul className="space-y-2.5">
                  {club.coordinators.map((member) => (
                    <li key={member.id} className="flex items-center gap-2.5">
                      <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{member.displayName}</p>
                        <p className="truncate text-[11.5px] text-faint">
                          {member.title ?? humanise(member.clubRole)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-faint">
                  <UserRound className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  Personal contact details are not published. Reach coordinators through the club email.
                </p>
              </section>
            )}

            {recruiting && club.recruitmentUrl && (
              <section className="rounded-md border border-brand/40 bg-brand-soft/50 p-4">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-brand-ink">
                  <DoorOpen className="size-4" aria-hidden="true" />
                  Applications open
                </h2>
                {club.recruitmentClosesAt && (
                  <p className="mt-1 text-[12.5px] text-brand-ink/80">
                    Closes {formatCountdown(club.recruitmentClosesAt, now).toLowerCase()}
                  </p>
                )}
                <Button variant="primary" size="sm" className="mt-3 w-full" asChild>
                  <a href={club.recruitmentUrl} target="_blank" rel="noopener noreferrer">
                    Open the application form
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </Button>
              </section>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
