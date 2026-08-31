import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { FilterChips } from '@/components/ui/tabs';
import { Table, Th, Td, Tr, DataList, DataListRow } from '@/components/ui/table';
import { PyqReviewActions } from '@/components/admin/pyq-review-actions';
import { pageMetadata } from '@/lib/metadata';
import { formatBytes, formatRelative, humanise } from '@/lib/format';
import { requirePagePermission } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { listPyqPapers } from '@/server/db/repositories/catalog';
import { getPyqHubConnector } from '@/server/integrations/pyq-hub';
import { Alert } from '@/components/ui/misc';
import { CONTENT_STATUSES, type ContentStatus } from '@/types/domain';
import { enumParam, hrefBuilder, intParam, type SearchParams } from '@/lib/query-params';

/** PYQ upload moderation. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'PYQ moderation',
  description: 'Approve or reject uploaded question papers.',
  path: '/admin/pyqs',
  noIndex: true,
});

export default async function AdminPyqPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePagePermission('pyq:approve');
  const params = await searchParams;
  const status = enumParam<ContentStatus | 'ALL'>(params, 'status', [...CONTENT_STATUSES, 'ALL'], 'PENDING_REVIEW');
  const page = intParam(params, 'page', 1);

  const result = await listPyqPapers({ page, pageSize: 25, status, sort: 'recent' });
  const buildHref = hrefBuilder('/admin/pyqs', params, { defaults: { status: 'PENDING_REVIEW', page: '1' } });
  const connector = getPyqHubConnector();
  const now = Date.now();
  const canDelete = can(user.role, 'pyq:delete');

  return (
    <div className="space-y-6">
      <header>
        <p className="t-eyebrow mb-1 text-faint">Console</p>
        <h1 className="t-h2 text-ink">PYQ moderation</h1>
        <p className="t-prose mt-2 max-w-2xl text-soft">
          Check the course code, exam type and year match the paper before approving. Approving publishes it and
          notifies whoever uploaded it.
        </p>
      </header>

      <Alert tone={connector.available ? 'success' : 'neutral'} title="PYQ Hub connector">
        {connector.describe()}
      </Alert>

      <FilterChips
        label="Status"
        activeKey={status}
        items={[
          { key: 'PENDING_REVIEW', label: 'Awaiting review', href: buildHref({ status: 'PENDING_REVIEW' }) },
          { key: 'PUBLISHED', label: 'Published', href: buildHref({ status: 'PUBLISHED' }) },
          { key: 'REJECTED', label: 'Rejected', href: buildHref({ status: 'REJECTED' }) },
          { key: 'ALL', label: 'All', href: buildHref({ status: 'ALL' }) },
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nothing awaiting review"
          description="Student uploads land here before they become searchable in the library."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table caption="Uploaded question papers">
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Exam</Th>
                  <Th>Branch / sem</Th>
                  <Th>File</Th>
                  <Th>Uploaded</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((paper) => (
                  <Tr key={paper.id}>
                    <Td>
                      <span className="font-mono text-[12px] text-muted">{paper.subjectCode}</span>
                      <p className="text-[13px] font-semibold text-ink">{paper.subjectName}</p>
                    </Td>
                    <Td>
                      <Badge tone="outline" size="xs">{paper.examType}</Badge>
                      <span className="vp-numeric ml-1.5 text-[12px] text-muted">{paper.year}</span>
                    </Td>
                    <Td className="text-[12.5px]">
                      {paper.branch} · Sem {paper.semester}
                    </Td>
                    <Td className="text-[12px] text-faint">
                      <a
                        href={paper.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link hover:underline underline-offset-2"
                      >
                        Open PDF
                      </a>
                      <span className="ml-1.5">{formatBytes(paper.fileSizeBytes)}</span>
                      {paper.reportCount > 0 && (
                        <Badge tone="danger" size="xs" className="ml-1.5">
                          {paper.reportCount} reports
                        </Badge>
                      )}
                    </Td>
                    <Td className="text-[12px] text-faint">{formatRelative(paper.createdAt, now)}</Td>
                    <Td>
                      <PyqReviewActions id={paper.id} status={paper.status} canDelete={canDelete} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          <DataList className="md:hidden">
            {result.items.map((paper) => (
              <DataListRow
                key={paper.id}
                title={`${paper.subjectCode} — ${paper.subjectName}`}
                subtitle={`${paper.examType} ${paper.year} · ${paper.branch} Sem ${paper.semester}`}
                meta={<Badge tone="outline" size="xs">{humanise(paper.status)}</Badge>}
                action={<PyqReviewActions id={paper.id} status={paper.status} canDelete={canDelete} />}
              />
            ))}
          </DataList>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            buildHref={(p) => buildHref({ page: p })}
            itemLabel="papers"
          />
        </>
      )}
    </div>
  );
}
