import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX, Sparkles } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/misc';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { searchAll, groupHits } from '@/server/db/repositories/search';
import { enumParam, param, type SearchParams } from '@/lib/query-params';
import type { SearchEntity } from '@/types/domain';

/**
 * Global search results.
 *
 * The full-page counterpart to the command palette. Results are tabbed by entity
 * and the query lives in the URL so a search is shareable.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const query = param(await searchParams, 'q');
  return pageMetadata({
    title: query ? `Search: ${query}` : 'Search',
    description: 'Search events, clubs, question papers, news, opportunities and resources across VITPulse.',
    path: '/search',
    noIndex: true,
  });
}

const TABS: Array<{ key: SearchEntity | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'event', label: 'Events' },
  { key: 'club', label: 'Clubs' },
  { key: 'pyq', label: 'PYQs' },
  { key: 'post', label: 'News' },
  { key: 'opportunity', label: 'Opportunities' },
  { key: 'resource', label: 'Resources' },
];

const SUGGESTIONS = ['hackathon', 'dbms', 'internship', 'recruitment', 'workshop', 'exam schedule'];

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = (param(params, 'q') ?? '').trim();
  const tab = enumParam<SearchEntity | 'all'>(params, 'tab', TABS.map((t) => t.key), 'all');

  const hits = query.length >= 2 ? await searchAll(query, { limitPerEntity: 20 }) : [];
  const grouped = groupHits(hits);
  const shown = tab === 'all' ? hits : grouped[tab];

  const buildTabHref = (key: string) =>
    `/search?q=${encodeURIComponent(query)}${key === 'all' ? '' : `&tab=${key}`}`;

  return (
    <>
      <PageHeader
        eyebrow="Search everything"
        title={query ? `Results for “${query}”` : 'Search VITPulse'}
        description={
          query
            ? `${hits.length} ${hits.length === 1 ? 'match' : 'matches'} across events, clubs, papers, news, opportunities and resources.`
            : 'One search across every part of the platform. Fuzzy matching means partial words and course codes work.'
        }
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Search' }]}
        action={
          <SearchField
            placeholder="Search VITPulse…"
            defaultValue={query}
            basePath="/search"
            className="min-w-64"
          />
        }
      >
        {query.length >= 2 && (
          <Tabs
            activeKey={tab}
            items={TABS.map((t) => ({
              key: t.key,
              label: t.label,
              href: buildTabHref(t.key),
              count: t.key === 'all' ? hits.length : grouped[t.key].length,
            }))}
          />
        )}
      </PageHeader>

      <PageBody>
        {query.length < 2 ? (
          <div className="mx-auto max-w-xl text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-md border border-line bg-surface text-faint">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[18px] font-semibold text-ink">Type at least two characters</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              Search matches titles, summaries, course codes, club short names and tags. Press{' '}
              <Kbd>⌘K</Kbd> anywhere to open the command palette instead.
            </p>
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Try searching for</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <Link
                    key={suggestion}
                    href={`/search?q=${encodeURIComponent(suggestion)}`}
                    className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:border-line-heavy hover:text-ink"
                  >
                    {suggestion}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={`No ${tab === 'all' ? '' : `${TABS.find((t) => t.key === tab)?.label.toLowerCase()} `}results for “${query}”`}
            description="Check the spelling, try a shorter term, or search a course code like CSE2004 or a club short name like ACM."
            action={
              <>
                {tab !== 'all' && hits.length > 0 && (
                  <Button size="sm" variant="primary" asChild>
                    <Link href={buildTabHref('all')}>See all {hits.length} results</Link>
                  </Button>
                )}
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/events">Browse events instead</Link>
                </Button>
              </>
            }
          />
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {shown.map((hit) => (
              <li key={`${hit.entity}-${hit.id}`}>
                <Link
                  href={hit.href}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas-alt"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-semibold leading-snug text-ink">{hit.title}</span>
                      <Badge tone="outline" size="xs">{humanise(hit.entity)}</Badge>
                      {hit.badge && <Badge tone="neutral" size="xs">{humanise(hit.badge)}</Badge>}
                    </span>
                    <span className="vp-clamp-2 mt-0.5 block text-[12.5px] text-muted">{hit.subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
