import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { ClubCard } from '@/components/content/club-card';
import { FilterChips, SegmentedControl } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/content/search-field';
import { AdSlot } from '@/components/content/ad-slot';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { CLUB_CATEGORIES, RECRUITMENT_STATUSES, type ClubCategory, type RecruitmentStatus } from '@/types/domain';
import { clubCategoryCounts, listClubs } from '@/server/db/repositories/clubs';
import { listFollowedClubIds } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/** The club directory. Built to scale to every registered chapter on campus. */

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Clubs & chapters',
  description:
    'Every registered student club and professional chapter at VIT-AP — technical, cultural, sports, professional, social, regional and creative — with live recruitment status.',
  path: '/clubs',
});

const PAGE_SIZE = 24;

export default async function ClubsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const category = enumParam<ClubCategory | 'ALL'>(params, 'category', [...CLUB_CATEGORIES, 'ALL'], 'ALL');
  const recruitment = enumParam<RecruitmentStatus | 'ALL'>(
    params, 'recruitment', [...RECRUITMENT_STATUSES, 'ALL'], 'ALL',
  );
  const sort = enumParam(params, 'sort', ['name', 'followers', 'recent'] as const, 'name');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const user = await getSessionUser();
  const [result, counts, followed] = await Promise.all([
    listClubs({
      page,
      pageSize: PAGE_SIZE,
      sort,
      ...(category !== 'ALL' ? { category } : {}),
      ...(recruitment !== 'ALL' ? { recruitment } : {}),
      ...(search ? { search } : {}),
    }),
    clubCategoryCounts(),
    listFollowedClubIds(user?.id ?? null),
  ]);

  const buildHref = hrefBuilder('/clubs', params, {
    defaults: { category: 'ALL', recruitment: 'ALL', sort: 'name', page: '1' },
  });
  const followedSet = new Set(followed);

  return (
    <>
      <PageHeader
        eyebrow="Get involved"
        title="Clubs & chapters"
        description="Follow the clubs you care about and their events will surface in your feed and your dashboard."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Clubs' }]}
        action={
          <>
            <SearchField placeholder="Search clubs…" defaultValue={search ?? ''} basePath="/clubs" />
            <SegmentedControl
              activeKey={sort}
              items={[
                { key: 'name', label: 'A–Z', href: buildHref({ sort: 'name' }) },
                { key: 'followers', label: 'Popular', href: buildHref({ sort: 'followers' }) },
                { key: 'recent', label: 'Active', href: buildHref({ sort: 'recent' }) },
              ]}
            />
          </>
        }
      >
        <div className="space-y-2">
          <FilterChips
            label="Club category"
            activeKey={category}
            items={[
              { key: 'ALL', label: 'All categories', href: buildHref({ category: 'ALL' }) },
              ...CLUB_CATEGORIES.map((c) => ({
                key: c,
                label: humanise(c),
                href: buildHref({ category: c }),
                count: counts[c] ?? 0,
              })),
            ]}
          />
          <FilterChips
            label="Recruitment"
            activeKey={recruitment}
            items={[
              { key: 'ALL', label: 'Any status', href: buildHref({ recruitment: 'ALL' }) },
              { key: 'OPEN', label: 'Recruiting now', href: buildHref({ recruitment: 'OPEN' }) },
              { key: 'UPCOMING', label: 'Opening soon', href: buildHref({ recruitment: 'UPCOMING' }) },
              { key: 'CLOSED', label: 'Closed', href: buildHref({ recruitment: 'CLOSED' }) },
            ]}
          />
        </div>
      </PageHeader>

      <PageBody>
        {result.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clubs match these filters"
            description={
              search
                ? `Nothing matches “${search}”. Try the club's short name, like "ACM" or "E-Cell".`
                : 'Try a different category, or clear the filters to browse everything.'
            }
            action={
              <Button size="sm" variant="secondary" asChild>
                <Link href="/clubs">Clear all filters</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  following={followedSet.has(club.id)}
                  signedIn={Boolean(user)}
                />
              ))}
            </div>
            <AdSlot placement="FEATURED_CLUB" variant="inline" className="mt-6" />
            <Pagination
              className="mt-6"
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              buildHref={(p) => buildHref({ page: p })}
              itemLabel="clubs"
            />
          </>
        )}
      </PageBody>
    </>
  );
}
