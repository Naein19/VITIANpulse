import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Timer } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { OpportunityCard } from '@/components/content/opportunity-card';
import { FilterChips } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/misc';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { OPPORTUNITY_TYPES, type OpportunityType } from '@/types/domain';
import { listOpportunities } from '@/server/db/repositories/catalog';
import { bookmarkedIds } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { makeContext } from '@/lib/ranking';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/** Internships, hackathons, scholarships, research and campus jobs. */

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Opportunities',
  description:
    'Internships, hackathons, competitions, scholarships, research positions, fellowships and campus jobs open to VIT-AP students, sorted by deadline.',
  path: '/opportunities',
});

const PAGE_SIZE = 12;

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const type = enumParam<OpportunityType | 'ALL'>(params, 'type', [...OPPORTUNITY_TYPES, 'ALL'], 'ALL');
  const filter = enumParam(params, 'filter', ['all', 'closing-soon', 'remote', 'for-me'] as const, 'all');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const user = await getSessionUser();
  const forMe = filter === 'for-me' && user;

  const result = await listOpportunities({
    page,
    pageSize: PAGE_SIZE,
    ...(type !== 'ALL' ? { type } : {}),
    ...(filter === 'closing-soon' ? { closingSoon: true } : {}),
    ...(filter === 'remote' ? { remoteOnly: true } : {}),
    ...(search ? { search } : {}),
    ...(forMe && user.branch ? { branch: user.branch } : {}),
    ...(forMe && user.year ? { year: user.year } : {}),
    ...(user
      ? {
          rankFor: makeContext({
            interests: new Set(user.interests.map((i) => i.toLowerCase())),
            branch: user.branch,
            year: user.year,
          }),
        }
      : {}),
  });

  const bookmarks = await bookmarkedIds(user?.id ?? null, 'OPPORTUNITY');
  const buildHref = hrefBuilder('/opportunities', params, { defaults: { type: 'ALL', filter: 'all', page: '1' } });
  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Build your record"
        title="Opportunities"
        description="Everything with a deadline — internships, scholarships, hackathons, research positions and campus roles."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Opportunities' }]}
        action={<SearchField placeholder="Search opportunities…" defaultValue={search ?? ''} basePath="/opportunities" />}
      >
        <div className="space-y-2">
          <FilterChips
            label="Quick filters"
            activeKey={filter}
            items={[
              { key: 'all', label: 'All open', href: buildHref({ filter: 'all' }) },
              { key: 'closing-soon', label: 'Closing soon', href: buildHref({ filter: 'closing-soon' }) },
              { key: 'remote', label: 'Remote', href: buildHref({ filter: 'remote' }) },
              ...(user ? [{ key: 'for-me', label: 'Matches my branch & year', href: buildHref({ filter: 'for-me' }) }] : []),
            ]}
          />
          <FilterChips
            label="Type"
            activeKey={type}
            items={[
              { key: 'ALL', label: 'All types', href: buildHref({ type: 'ALL' }) },
              ...OPPORTUNITY_TYPES.map((t) => ({ key: t, label: humanise(t), href: buildHref({ type: t }) })),
            ]}
          />
        </div>
      </PageHeader>

      <PageBody>
        {filter === 'for-me' && user && !user.branch && (
          <Alert
            tone="info"
            className="mb-5"
            title="Set your branch and year to use this filter"
            action={
              <Button size="sm" variant="secondary" asChild>
                <Link href="/profile">Update profile</Link>
              </Button>
            }
          >
            Once your branch and year are set, VITPulse only shows opportunities you are actually eligible for.
          </Alert>
        )}

        {filter === 'closing-soon' && result.items.length > 0 && (
          <Alert tone="warning" className="mb-5" title="These close within seven days">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="size-3.5" aria-hidden="true" />
              Sorted by how soon they close. Bookmark anything you want to come back to.
            </span>
          </Alert>
        )}

        {result.items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nothing open with these filters"
            description={
              filter === 'closing-soon'
                ? 'Nothing is closing in the next week. Check the full list for everything currently open.'
                : 'Try a different type, or clear the filters to see everything currently open.'
            }
            action={
              <Button size="sm" variant="secondary" asChild>
                <Link href="/opportunities">See all open opportunities</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  bookmarked={bookmarks.has(opportunity.id)}
                  signedIn={Boolean(user)}
                  now={now}
                />
              ))}
            </div>
            <Pagination
              className="mt-6"
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              buildHref={(p) => buildHref({ page: p })}
              itemLabel="opportunities"
            />
          </>
        )}
      </PageBody>
    </>
  );
}
