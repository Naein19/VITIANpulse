import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { ArrowLeft, CalendarClock, MapPin, Tag } from 'lucide-react';
import { PageBody } from '@/components/layout/page-header';
import { Badge, CategoryBadge, ImportanceBadge } from '@/components/ui/badge';
import { Alert, Avatar, Breadcrumbs, RichText } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { BookmarkButton } from '@/components/content/bookmark-button';
import { ShareButton } from '@/components/content/share-button';
import { ReportButton } from '@/components/content/report-button';
import { PostCard } from '@/components/content/post-card';
import { ClubAvatar } from '@/components/content/club-card';
import { JsonLd } from '@/components/seo/json-ld';
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from '@/lib/metadata';
import { formatCount, formatDateLong, formatDateTime, formatRelative } from '@/lib/format';
import { getPostBySlug, incrementPostView, listRelatedPosts } from '@/server/db/repositories/posts';
import { isBookmarked } from '@/server/db/repositories/engagement';
import { trackSafe } from '@/server/db/repositories/analytics';
import { currentVisitorHash } from '@/server/actions/_shared';
import { getSessionUser } from '@/server/auth/session';
import { siteUrl } from '@/lib/env';

/** A single campus story. */

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== 'PUBLISHED') {
    return pageMetadata({ title: 'Story not found', description: 'This story is not available.', path: `/news/${slug}`, noIndex: true });
  }
  return pageMetadata({
    title: post.title,
    description: post.summary,
    path: `/news/${post.slug}`,
    type: 'article',
    image: post.coverImageUrl,
    publishedTime: post.publishedAt,
    tags: post.tags,
  });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== 'PUBLISHED') notFound();

  const user = await getSessionUser();
  const [related, bookmarked] = await Promise.all([
    listRelatedPosts(post, 3),
    user ? isBookmarked(user.id, 'POST', post.id) : Promise.resolve(false),
  ]);

  // Counters and analytics run after the response is streamed, so measurement
  // never sits between the reader and the page.
  after(async () => {
    await incrementPostView(post.id);
    await trackSafe({
      name: 'post_view',
      path: `/news/${post.slug}`,
      entityId: post.id,
      visitorHash: await currentVisitorHash(),
      meta: { category: post.category, importance: post.importance },
    });
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'News', href: '/news' },
    { label: post.title },
  ];

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: post.title,
          description: post.summary,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          url: `${siteUrl}/news/${post.slug}`,
          author: post.author?.displayName ?? post.source,
          section: post.category,
        })}
      />
      <JsonLd data={breadcrumbJsonLd(breadcrumbs.slice(0, 2).map((b) => ({ label: b.label, href: b.href! })))} />

      <PageBody className="max-w-[var(--content-max)]">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_290px]">
          <article className="min-w-0 max-w-3xl">
            <Breadcrumbs items={breadcrumbs} />

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CategoryBadge category={post.category} size="sm" />
              <ImportanceBadge importance={post.importance} />
              {post.pinned && <Badge tone="outline" size="xs">Pinned</Badge>}
            </div>

            <h1 className="text-[30px] leading-[1.12] text-ink sm:text-[38px]">{post.title}</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-muted">{post.summary}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-line py-3 text-[12.5px] text-faint">
              {post.author && (
                <span className="flex items-center gap-2">
                  <Avatar name={post.author.displayName} src={post.author.avatarUrl} size="xs" />
                  <span className="text-soft">{post.author.displayName}</span>
                </span>
              )}
              <span>{post.source}</span>
              {post.publishedAt && (
                <time dateTime={post.publishedAt} title={formatDateTime(post.publishedAt)}>
                  {formatDateLong(post.publishedAt)}
                </time>
              )}
              <span className="vp-numeric">{formatCount(post.viewCount)} views</span>

              <span className="ml-auto flex items-center gap-1.5">
                <ShareButton title={post.title} path={`/news/${post.slug}`} withLabel />
                <BookmarkButton
                  targetType="POST"
                  targetId={post.id}
                  initial={bookmarked}
                  signedIn={Boolean(user)}
                  withLabel
                />
              </span>
            </div>

            {post.importance === 'URGENT' && (
              <Alert tone="danger" title="Marked urgent" className="mt-5">
                Campus editors flagged this notice as urgent. Check the source before acting on anything time-critical.
              </Alert>
            )}

            <div className="mt-6">
              <RichText text={post.body} />
            </div>

            {(post.location || post.eventDate) && (
              <dl className="mt-7 grid gap-2 rounded-md border border-line bg-primary p-4 sm:grid-cols-2">
                {post.location && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Location</dt>
                      <dd className="mt-0.5 text-[13.5px] text-ink">{post.location}</dd>
                    </div>
                  </div>
                )}
                {post.eventDate && (
                  <div className="flex items-start gap-2.5">
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">When</dt>
                      <dd className="mt-0.5 text-[13.5px] text-ink">
                        {formatDateTime(post.eventDate)}{' '}
                        <span className="text-faint">({formatRelative(post.eventDate)})</span>
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            )}

            {post.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-1.5">
                <Tag className="size-3.5 text-faint" aria-hidden="true" />
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/news?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-line-strong bg-primary px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/news">
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Back to all news
                </Link>
              </Button>
              <ReportButton targetType="POST" targetId={post.id} signedIn={Boolean(user)} />
            </div>
          </article>

          <aside className="min-w-0 space-y-7 lg:sticky lg:top-4 lg:self-start">
            {post.club && (
              <section className="rounded-md border border-line bg-primary p-4">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                  Published by
                </h2>
                <Link href={`/clubs/${post.club.slug}`} className="flex items-center gap-3 group">
                  <ClubAvatar club={{ ...post.club, logoUrl: post.club.logoUrl }} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink group-hover:underline underline-offset-2">
                      {post.club.name}
                    </span>
                    <span className="block text-[11.5px] text-faint">View club page</span>
                  </span>
                </Link>
              </section>
            )}

            {related.length > 0 && (
              <section>
                <h2 className="mb-1 border-b border-line-strong pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                  Related stories
                </h2>
                <div>
                  {related.map((item) => (
                    <PostCard key={item.id} post={item} variant="compact" />
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
