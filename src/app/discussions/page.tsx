import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { FilterChips, SegmentedControl } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/misc';
import { NewDiscussionDialog } from '@/components/community/new-discussion';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { formatCount, formatRelative, humanise } from '@/lib/format';
import { DISCUSSION_CATEGORIES, type DiscussionCategory } from '@/types/domain';
import { listDiscussions } from '@/server/db/repositories/community';
import { getSessionUser } from '@/server/auth/session';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/** Student discussions — deliberately small, signed-in and moderated. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Discussions',
  description: 'Student threads on academics, events, hostel life, campus, clubs and placements at VIT-AP.',
  path: '/discussions',
});

const PAGE_SIZE = 20;

export default async function DiscussionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const category = enumParam<DiscussionCategory | 'ALL'>(
    params, 'category', [...DISCUSSION_CATEGORIES, 'ALL'], 'ALL',
  );
  const sort = enumParam(params, 'sort', ['recent', 'top', 'active'] as const, 'recent');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const user = await getSessionUser();
  const result = await listDiscussions({
    page,
    pageSize: PAGE_SIZE,
    sort,
    ...(category !== 'ALL' ? { category } : {}),
    ...(search ? { search } : {}),
  });

  const buildHref = hrefBuilder('/discussions', params, { defaults: { category: 'ALL', sort: 'recent', page: '1' } });
  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Ask the campus"
        title="Discussions"
        description="Questions that are genuinely better answered by other students than by a notice board."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Discussions' }]}
        action={
          <>
            <SearchField placeholder="Search threads…" defaultValue={search ?? ''} basePath="/discussions" />
            <SegmentedControl
              activeKey={sort}
              items={[
                { key: 'recent', label: 'Newest', href: buildHref({ sort: 'recent' }) },
                { key: 'active', label: 'Active', href: buildHref({ sort: 'active' }) },
                { key: 'top', label: 'Top', href: buildHref({ sort: 'top' }) },
              ]}
            />
            <NewDiscussionDialog signedIn={Boolean(user)} />
          </>
        }
      >
        <FilterChips
          label="Discussion category"
          activeKey={category}
          items={[
            { key: 'ALL', label: 'All topics', href: buildHref({ category: 'ALL' }) },
            ...DISCUSSION_CATEGORIES.map((c) => ({ key: c, label: humanise(c), href: buildHref({ category: c }) })),
          ]}
        />
      </PageHeader>

      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            {result.items.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No threads here yet"
                description={
                  search
                    ? `Nothing matches “${search}”. Try a broader term, or start the thread yourself.`
                    : 'Be the first to ask something in this category.'
                }
                action={<NewDiscussionDialog signedIn={Boolean(user)} />}
              />
            ) : (
              <>
                <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-primary">
                  {result.items.map((discussion) => (
                    <li key={discussion.id} className="group relative transition-colors hover:bg-accent">
                      <div className="flex gap-3 p-4">
                        <div className="flex w-11 shrink-0 flex-col items-center gap-0.5 rounded-sm border border-line bg-tertiary py-1.5">
                          <span className="vp-numeric text-[14px] font-bold leading-none text-ink">
                            {formatCount(discussion.upvoteCount)}
                          </span>
                          <span className="text-[9.5px] uppercase tracking-wide text-faint">votes</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge tone="outline" size="xs">{humanise(discussion.category)}</Badge>
                            {discussion.locked && <Badge tone="neutral" size="xs">Locked</Badge>}
                          </div>
                          <h2 className="t-strong leading-snug text-ink">
                            <Link
                              href={`/discussions/${discussion.slug}`}
                              className="after:absolute after:inset-0 hover:underline underline-offset-[3px]"
                            >
                              {discussion.title}
                            </Link>
                          </h2>
                          <p className="vp-clamp-2 mt-1 text-[13px] leading-relaxed text-muted">{discussion.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
                            {discussion.author && (
                              <span className="flex items-center gap-1.5">
                                <Avatar name={discussion.author.displayName} src={discussion.author.avatarUrl} size="xs" />
                                {discussion.author.displayName}
                              </span>
                            )}
                            <time dateTime={discussion.createdAt}>{formatRelative(discussion.createdAt, now)}</time>
                            <span className="vp-numeric">
                              {discussion.commentCount} {discussion.commentCount === 1 ? 'reply' : 'replies'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination
                  className="mt-6"
                  page={result.page}
                  pageSize={result.pageSize}
                  total={result.total}
                  buildHref={(p) => buildHref({ page: p })}
                  itemLabel="threads"
                />
              </>
            )}
          </div>

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-4 lg:self-start">
            <section className="rounded-md border border-line bg-tertiary p-4">
              <h2 className="flex items-center gap-2 t-sm-strong text-ink">
                <ShieldCheck className="size-3.5 text-faint" aria-hidden="true" />
                How this stays useful
              </h2>
              <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-muted">
                <li>Posting requires a signed-in university account — there is no anonymous posting.</li>
                <li>Threads are rate limited and need a real question, not just a link.</li>
                <li>Everything is reportable, and moderators can hide a thread in one click.</li>
                <li>Your name is attached to what you write. That is the point.</li>
              </ul>
            </section>

            <section className="rounded-md border border-line bg-primary p-4">
              <h2 className="t-label mb-2 text-faint">Categories</h2>
              <ul className="space-y-0.5">
                {DISCUSSION_CATEGORIES.map((c) => (
                  <li key={c}>
                    <Link
                      href={buildHref({ category: c })}
                      className="block rounded-sm px-2 py-1.5 text-[13px] text-soft transition-colors hover:bg-accent hover:text-ink"
                    >
                      {humanise(c)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
