import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, SlidersHorizontal } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { PostCard } from '@/components/content/post-card';
import { FilterChips } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/content/ad-slot';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { POST_CATEGORIES, IMPORTANCE, type PostCategory, type Importance } from '@/types/domain';
import { listPosts } from '@/server/db/repositories/posts';
import { bookmarkedIds, listFollowedClubIds } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { makeContext } from '@/lib/ranking';
import { enumParam, hrefBuilder, intParam, optionalEnumParam, param, type SearchParams } from '@/lib/query-params';
import { SearchField } from '@/components/content/search-field';

/** The full campus feed, filterable by category and importance. */

export const revalidate = 120;

export const metadata: Metadata = pageMetadata({
  title: 'Campus news',
  description:
    'Announcements, guest visits, sports, club news and academic notices from across VIT-AP, newest first.',
  path: '/news',
});

const PAGE_SIZE = 12;

export default async function NewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = intParam(params, 'page', 1);
  const category = enumParam<PostCategory | 'ALL'>(params, 'category', [...POST_CATEGORIES, 'ALL'], 'ALL');
  const importance = optionalEnumParam<Importance>(params, 'importance', IMPORTANCE);
  const search = param(params, 'q');
  const sort = enumParam(params, 'sort', ['recent', 'foryou'] as const, 'recent');

  const user = await getSessionUser();
  const followedClubIds = await listFollowedClubIds(user?.id ?? null);

  const result = await listPosts({
    page,
    pageSize: PAGE_SIZE,
    ...(category !== 'ALL' ? { category } : {}),
    ...(importance ? { importance } : {}),
    ...(search ? { search } : {}),
    ...(sort === 'foryou'
      ? {
          rankFor: makeContext({
            followedClubIds: new Set(followedClubIds),
            interests: new Set((user?.interests ?? []).map((i) => i.toLowerCase())),
            branch: user?.branch ?? null,
            year: user?.year ?? null,
          }),
        }
      : {}),
  });

  const bookmarks = await bookmarkedIds(user?.id ?? null, 'POST');
  const buildHref = hrefBuilder('/news', params, { defaults: { category: 'ALL', sort: 'recent', page: '1' } });
  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Campus Pulse"
        title="Campus news"
        description="Every announcement, guest visit, result and notice published on VITPulse."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
        action={
          <>
            <SearchField placeholder="Search news…" defaultValue={search ?? ''} basePath="/news" />
            {user && (
              <Button size="sm" variant={sort === 'foryou' ? 'primary' : 'secondary'} asChild>
                <Link href={buildHref({ sort: sort === 'foryou' ? 'recent' : 'foryou' })}>
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  {sort === 'foryou' ? 'Ranked for you' : 'Rank for me'}
                </Link>
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-2">
          <FilterChips
            label="Category"
            activeKey={category}
            items={[
              { key: 'ALL', label: 'All categories', href: buildHref({ category: 'ALL' }) },
              ...POST_CATEGORIES.map((c) => ({
                key: c,
                label: humanise(c),
                href: buildHref({ category: c }),
              })),
            ]}
          />
          <FilterChips
            label="Importance"
            activeKey={importance ?? 'ALL'}
            items={[
              { key: 'ALL', label: 'Any importance', href: buildHref({ importance: undefined }) },
              { key: 'IMPORTANT', label: 'Important', href: buildHref({ importance: 'IMPORTANT' }) },
              { key: 'URGENT', label: 'Urgent only', href: buildHref({ importance: 'URGENT' }) },
            ]}
          />
        </div>
      </PageHeader>

      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {result.items.length === 0 ? (
              <EmptyState
                icon={Newspaper}
                title="No stories match these filters"
                description={
                  search
                    ? `Nothing published matches “${search}”. Try a broader term or clear the filters.`
                    : 'Try a different category, or clear the filters to see everything.'
                }
                action={
                  <Button size="sm" variant="secondary" asChild>
                    <Link href="/news">Clear all filters</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="space-y-3">
                  {result.items.map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      variant={index === 0 && page === 1 ? 'lead' : 'default'}
                      bookmarked={bookmarks.has(post.id)}
                      signedIn={Boolean(user)}
                      now={now}
                    />
                  ))}
                </div>
                <Pagination
                  className="mt-7"
                  page={result.page}
                  pageSize={result.pageSize}
                  total={result.total}
                  buildHref={(p) => buildHref({ page: p })}
                  itemLabel="stories"
                />
              </>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            <AdSlot placement="SIDEBAR" variant="card" />
            <nav aria-label="Browse by category" className="rounded-md border border-line bg-primary p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Categories</h2>
              <ul className="space-y-0.5">
                {POST_CATEGORIES.map((c) => (
                  <li key={c}>
                    <Link
                      href={buildHref({ category: c })}
                      className="flex items-center justify-between rounded-sm px-2 py-1.5 text-[13px] text-soft transition-colors hover:bg-accent hover:text-ink"
                    >
                      {humanise(c)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
