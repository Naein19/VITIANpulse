import type { Metadata } from 'next';
import { UsersRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { FilterChips } from '@/components/ui/tabs';
import { UserTable } from '@/components/admin/user-table';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { requirePagePermission } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { listUsers, roleDistribution } from '@/server/db/repositories/admin';
import { ROLES, type Role } from '@/types/domain';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/** User administration: roles and suspension. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Users',
  description: 'Manage roles and accounts.',
  path: '/admin/users',
  noIndex: true,
});

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const actor = await requirePagePermission('user:list');
  const params = await searchParams;
  const role = enumParam<Role | 'ALL'>(params, 'role', [...ROLES, 'ALL'], 'ALL');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const [result, distribution] = await Promise.all([
    listUsers({ page, pageSize: 25, ...(role !== 'ALL' ? { role } : {}), ...(search ? { search } : {}) }),
    roleDistribution(),
  ]);

  const buildHref = hrefBuilder('/admin/users', params, { defaults: { role: 'ALL', page: '1' } });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow mb-1 text-faint">Console</p>
          <h1 className="t-h2 text-ink">Users</h1>
          <p className="t-prose mt-2 max-w-2xl text-soft">
            Roles decide what someone can do. Only a super admin can grant admin or super admin, and nobody can change
            their own role.
          </p>
        </div>
        <SearchField placeholder="Name, email or register no…" defaultValue={search ?? ''} basePath="/admin/users" />
      </header>

      <FilterChips
        label="Role"
        activeKey={role}
        items={[
          { key: 'ALL', label: 'All roles', href: buildHref({ role: 'ALL' }), count: result.total },
          ...ROLES.map((r) => ({
            key: r,
            label: humanise(r),
            href: buildHref({ role: r }),
            count: distribution[r] ?? 0,
          })),
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No accounts match"
          description="Try a different role filter, or search by email or register number."
        />
      ) : (
        <>
          <UserTable
            users={result.items}
            actorId={actor.id}
            actorRole={actor.role}
            canAssign={can(actor.role, 'user:role:assign')}
            canSuspend={can(actor.role, 'user:suspend')}
          />
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            buildHref={(p) => buildHref({ page: p })}
            itemLabel="accounts"
          />
        </>
      )}
    </div>
  );
}
