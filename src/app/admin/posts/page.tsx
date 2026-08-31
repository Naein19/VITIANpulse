import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { Badge, CategoryBadge, ImportanceBadge } from '@/components/ui/badge';
import { Table, Th, Td, Tr, DataList, DataListRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { FilterChips } from '@/components/ui/tabs';
import { StatusActions } from '@/components/admin/status-actions';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { formatRelative, humanise } from '@/lib/format';
import { requirePagePermission } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { listPostsForAdmin } from '@/server/db/repositories/posts';
import { CONTENT_STATUSES, type ContentStatus } from '@/types/domain';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/** Editorial queue for campus posts. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Posts',
  description: 'Editorial queue.',
  path: '/admin/posts',
  noIndex: true,
});

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePagePermission('post:edit:any');
  const params = await searchParams;
  const status = enumParam<ContentStatus | 'ALL'>(params, 'status', [...CONTENT_STATUSES, 'ALL'], 'ALL');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const result = await listPostsForAdmin({
    page,
    pageSize: 20,
    status,
    ...(search ? { search } : {}),
  });

  const buildHref = hrefBuilder('/admin/posts', params, { defaults: { status: 'ALL', page: '1' } });
  const now = Date.now();
  const canPublish = can(user.role, 'post:publish');
  const canDelete = can(user.role, 'post:delete');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow mb-1 text-faint">Console</p>
          <h1 className="t-h2 text-ink">Posts</h1>
          <p className="t-prose mt-2 max-w-2xl text-soft">
            Club admins submit for review; editors publish. Publishing a club post notifies that club&rsquo;s followers.
          </p>
        </div>
        <SearchField placeholder="Search titles…" defaultValue={search ?? ''} basePath="/admin/posts" />
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
        <EmptyState
          icon={Newspaper}
          title="Nothing in this queue"
          description="Posts submitted by club admins and drafts written by editors appear here."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table caption="Posts awaiting editorial action">
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((post) => (
                  <Tr key={post.id}>
                    <Td>
                      <Link
                        href={`/news/${post.slug}`}
                        className="text-[13px] font-semibold text-ink hover:underline underline-offset-2"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-0.5 text-[11.5px] text-faint">
                        {post.club?.shortName ?? post.source}
                        {post.author ? ` · ${post.author.displayName}` : ''}
                      </p>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CategoryBadge category={post.category} />
                        <ImportanceBadge importance={post.importance} />
                      </div>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          post.status === 'PUBLISHED' ? 'success'
                          : post.status === 'PENDING_REVIEW' ? 'warning'
                          : post.status === 'REJECTED' ? 'danger' : 'neutral'
                        }
                        size="xs"
                      >
                        {humanise(post.status)}
                      </Badge>
                    </Td>
                    <Td className="text-[12px] text-faint">{formatRelative(post.updatedAt, now)}</Td>
                    <Td>
                      <StatusActions
                        kind="post"
                        id={post.id}
                        status={post.status}
                        canPublish={canPublish}
                        canDelete={canDelete}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          <DataList className="md:hidden">
            {result.items.map((post) => (
              <DataListRow
                key={post.id}
                title={post.title}
                subtitle={post.club?.shortName ?? post.source}
                meta={
                  <>
                    <CategoryBadge category={post.category} />
                    <Badge tone={post.status === 'PUBLISHED' ? 'success' : 'warning'} size="xs">
                      {humanise(post.status)}
                    </Badge>
                  </>
                }
                action={
                  <StatusActions
                    kind="post"
                    id={post.id}
                    status={post.status}
                    canPublish={canPublish}
                    canDelete={canDelete}
                  />
                }
              />
            ))}
          </DataList>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            buildHref={(p) => buildHref({ page: p })}
            itemLabel="posts"
          />
        </>
      )}
    </div>
  );
}
