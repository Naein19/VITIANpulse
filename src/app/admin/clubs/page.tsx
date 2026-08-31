import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, Th, Td, Tr, DataList, DataListRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { FilterChips } from '@/components/ui/tabs';
import { ClubAdminActions } from '@/components/admin/club-actions';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { formatCount, humanise } from '@/lib/format';
import { requirePagePermission } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { listClubs } from '@/server/db/repositories/clubs';
import { CONTENT_STATUSES, type ContentStatus } from '@/types/domain';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/** Club approval and verification. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Clubs',
  description: 'Approve and verify clubs.',
  path: '/admin/clubs',
  noIndex: true,
});

export default async function AdminClubsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePagePermission('club:approve');
  const params = await searchParams;
  const status = enumParam<ContentStatus | 'ALL'>(params, 'status', [...CONTENT_STATUSES, 'ALL'], 'ALL');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const result = await listClubs({
    page,
    pageSize: 25,
    status,
    sort: 'name',
    ...(search ? { search } : {}),
  });

  const buildHref = hrefBuilder('/admin/clubs', params, { defaults: { status: 'ALL', page: '1' } });
  const canVerify = can(user.role, 'club:verify');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow mb-1 text-faint">Console</p>
          <h1 className="t-h2 text-ink">Clubs</h1>
          <p className="t-prose mt-2 max-w-2xl text-soft">
            New clubs arrive as pending. Approving publishes them to the directory; verifying adds the badge that tells
            students the university recognises them.
          </p>
        </div>
        <SearchField placeholder="Search clubs…" defaultValue={search ?? ''} basePath="/admin/clubs" />
      </header>

      <FilterChips
        label="Status"
        activeKey={status}
        items={[
          { key: 'ALL', label: 'All', href: buildHref({ status: 'ALL' }) },
          ...CONTENT_STATUSES.map((s) => ({ key: s, label: humanise(s), href: buildHref({ status: s }) })),
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState icon={Users} title="No clubs match" description="New submissions appear here for approval." />
      ) : (
        <>
          <div className="hidden md:block">
            <Table caption="Registered clubs">
              <thead>
                <tr>
                  <Th>Club</Th>
                  <Th>Category</Th>
                  <Th>Recruitment</Th>
                  <Th>Followers</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((club) => (
                  <Tr key={club.id}>
                    <Td>
                      <Link
                        href={`/clubs/${club.slug}`}
                        className="text-[13px] font-semibold text-ink hover:underline underline-offset-2"
                      >
                        {club.name}
                      </Link>
                      <p className="mt-0.5 text-[11.5px] text-faint">{club.shortName}</p>
                    </Td>
                    <Td className="text-[12.5px]">{humanise(club.category)}</Td>
                    <Td>
                      <Badge
                        tone={club.recruitmentStatus === 'OPEN' ? 'success' : club.recruitmentStatus === 'UPCOMING' ? 'info' : 'neutral'}
                        size="xs"
                      >
                        {humanise(club.recruitmentStatus)}
                      </Badge>
                    </Td>
                    <Td className="vp-numeric text-[12.5px]">{formatCount(club.followerCount)}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={club.status === 'PUBLISHED' ? 'success' : club.status === 'PENDING_REVIEW' ? 'warning' : 'neutral'}
                          size="xs"
                        >
                          {humanise(club.status)}
                        </Badge>
                        {club.verified && <Badge tone="brand" size="xs">Verified</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <ClubAdminActions
                        id={club.id}
                        status={club.status}
                        verified={club.verified}
                        canVerify={canVerify}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          <DataList className="md:hidden">
            {result.items.map((club) => (
              <DataListRow
                key={club.id}
                title={club.name}
                subtitle={humanise(club.category)}
                meta={
                  <>
                    <Badge tone={club.status === 'PUBLISHED' ? 'success' : 'warning'} size="xs">
                      {humanise(club.status)}
                    </Badge>
                    {club.verified && <Badge tone="brand" size="xs">Verified</Badge>}
                  </>
                }
                action={
                  <ClubAdminActions id={club.id} status={club.status} verified={club.verified} canVerify={canVerify} />
                }
              />
            ))}
          </DataList>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            buildHref={(p) => buildHref({ page: p })}
            itemLabel="clubs"
          />
        </>
      )}
    </div>
  );
}
