import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, FolderOpen } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { FilterChips, SegmentedControl } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { PaperRow } from '@/components/pyq/paper-row';
import { UploadPaperDialog } from '@/components/pyq/upload-dialog';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { formatCount } from '@/lib/format';
import { BRANCHES, EXAM_TYPES, EXAM_TYPE_LABEL, type Branch, type ExamType } from '@/types/domain';
import { listPyqPapers, listPyqSubjects, pyqBranchSummary } from '@/server/db/repositories/catalog';
import { fetchExternalPapers } from '@/server/integrations/pyq-hub';
import { bookmarkedIds } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { enumParam, hrefBuilder, intParam, optionalEnumParam, param, type SearchParams } from '@/lib/query-params';

/**
 * Branch view: semester → course → papers.
 *
 * Semester and course are query parameters rather than nested routes, because
 * students move between them constantly and a full navigation per click would
 * be slower than a filtered re-render of the same page.
 */

export const revalidate = 600;

export async function generateStaticParams() {
  const branches = await pyqBranchSummary();
  return branches.map((b) => ({ branch: b.branch.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ branch: string }> }): Promise<Metadata> {
  const { branch } = await params;
  const upper = branch.toUpperCase() as Branch;
  if (!BRANCHES.includes(upper)) {
    return pageMetadata({ title: 'Branch not found', description: 'Unknown branch.', path: `/pyqs/${branch}`, noIndex: true });
  }
  return pageMetadata({
    title: `${upper} question papers`,
    description: `Previous year question papers for ${upper} at VIT-AP, organised by semester, course and exam type.`,
    path: `/pyqs/${branch}`,
  });
}

const PAGE_SIZE = 25;

export default async function BranchPyqPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ branch: branchParam }, query] = await Promise.all([params, searchParams]);
  const branch = branchParam.toUpperCase() as Branch;
  if (!BRANCHES.includes(branch)) notFound();

  const semester = query.semester ? intParam(query, 'semester', 0) : 0;
  const subjectCode = param(query, 'subject');
  const examType = optionalEnumParam<ExamType>(query, 'exam', EXAM_TYPES);
  const yearFilter = query.year ? intParam(query, 'year', 0) : 0;
  const sort = enumParam(query, 'sort', ['year', 'recent', 'popular'] as const, 'year');
  const search = param(query, 'q');
  const page = intParam(query, 'page', 1);

  const user = await getSessionUser();

  const [subjects, papers, external, bookmarks, summary] = await Promise.all([
    listPyqSubjects(branch, semester || undefined),
    listPyqPapers({
      branch,
      page,
      pageSize: PAGE_SIZE,
      sort,
      ...(semester ? { semester } : {}),
      ...(subjectCode ? { subjectCode } : {}),
      ...(examType ? { examType } : {}),
      ...(yearFilter ? { year: yearFilter } : {}),
      ...(search ? { search } : {}),
    }),
    fetchExternalPapers({
      branch,
      limit: 20,
      ...(semester ? { semester } : {}),
      ...(subjectCode ? { subjectCode } : {}),
      ...(search ? { search } : {}),
    }),
    bookmarkedIds(user?.id ?? null, 'PYQ'),
    pyqBranchSummary(),
  ]);

  const basePath = `/pyqs/${branchParam.toLowerCase()}`;
  const buildHref = hrefBuilder(basePath, query, { defaults: { sort: 'year', page: '1' } });

  const semesters = [...new Set(subjects.map((s) => s.semester))].sort((a, b) => a - b);
  const years = [...new Set(papers.items.map((p) => p.year))].sort((a, b) => b - a);
  const activeSubject = subjectCode ? subjects.find((s) => s.code === subjectCode) : undefined;
  const branchStats = summary.find((s) => s.branch === branch);
  const allPapers = [...papers.items, ...external];

  return (
    <>
      <PageHeader
        eyebrow="PYQ Hub"
        title={`${branch} question papers`}
        description={
          branchStats
            ? `${formatCount(branchStats.papers)} papers across ${formatCount(branchStats.subjects)} courses. Narrow by semester, course, exam type or year.`
            : 'Narrow by semester, course, exam type or year.'
        }
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'PYQs', href: '/pyqs' },
          { label: branch },
        ]}
        action={
          <>
            <SearchField placeholder="Course code or name…" defaultValue={search ?? ''} basePath={basePath} />
            <UploadPaperDialog signedIn={Boolean(user)} />
          </>
        }
      >
        <div className="space-y-2">
          <FilterChips
            label="Branch"
            activeKey={branch}
            items={summary.map((s) => ({
              key: s.branch,
              label: s.branch,
              href: `/pyqs/${s.branch.toLowerCase()}`,
              count: s.papers,
            }))}
          />
          {semesters.length > 0 && (
            <FilterChips
              label="Semester"
              activeKey={semester ? String(semester) : 'ALL'}
              items={[
                { key: 'ALL', label: 'All semesters', href: buildHref({ semester: undefined, subject: undefined }) },
                ...semesters.map((s) => ({
                  key: String(s),
                  label: `Sem ${s}`,
                  href: buildHref({ semester: s, subject: undefined }),
                })),
              ]}
            />
          )}
        </div>
      </PageHeader>

      <PageBody>
        <div className="grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* ------------------------------------------------- course picker */}
          <aside className="min-w-0">
            <div className="lg:sticky lg:top-[calc(var(--topbar-h)+16px)]">
              <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink">Courses</h2>
                {subjectCode && (
                  <Link
                    href={buildHref({ subject: undefined })}
                    className="text-[11.5px] font-medium text-link hover:underline underline-offset-2"
                  >
                    Clear
                  </Link>
                )}
              </div>

              {subjects.length === 0 ? (
                <p className="py-4 text-[12.5px] text-faint">No courses listed for this branch yet.</p>
              ) : (
                <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto pr-1">
                  {subjects.map((subject) => {
                    const active = subject.code === subjectCode;
                    return (
                      <li key={subject.id}>
                        <Link
                          href={buildHref({ subject: subject.code, semester: subject.semester })}
                          scroll={false}
                          aria-current={active ? 'true' : undefined}
                          className={`block rounded-sm px-2 py-1.5 transition-colors ${
                            active ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-accent hover:text-ink'
                          }`}
                        >
                          <span className="block font-mono text-[11.5px] opacity-80">{subject.code}</span>
                          <span className="block truncate text-[12.5px] font-medium">{subject.name}</span>
                          <span className="vp-numeric block text-[11px] opacity-60">
                            Sem {subject.semester} · {subject.paperCount} papers
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* -------------------------------------------------------- papers */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold leading-tight text-ink">
                  {activeSubject ? `${activeSubject.code} — ${activeSubject.name}` : 'All papers'}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-faint">
                  <span className="vp-numeric">{papers.total}</span> in the VITPulse library
                  {external.length > 0 && (
                    <>
                      {' · '}
                      <span className="vp-numeric">{external.length}</span> from the PYQ Hub
                    </>
                  )}
                </p>
              </div>
              <SegmentedControl
                activeKey={sort}
                items={[
                  { key: 'year', label: 'By year', href: buildHref({ sort: 'year' }) },
                  { key: 'recent', label: 'Newest', href: buildHref({ sort: 'recent' }) },
                  { key: 'popular', label: 'Popular', href: buildHref({ sort: 'popular' }) },
                ]}
              />
            </div>

            <div className="mb-4 space-y-2">
              <FilterChips
                label="Exam type"
                activeKey={examType ?? 'ALL'}
                items={[
                  { key: 'ALL', label: 'All exams', href: buildHref({ exam: undefined }) },
                  ...EXAM_TYPES.map((type) => ({ key: type, label: EXAM_TYPE_LABEL[type], href: buildHref({ exam: type }) })),
                ]}
              />
              {years.length > 1 && (
                <FilterChips
                  label="Year"
                  activeKey={yearFilter ? String(yearFilter) : 'ALL'}
                  items={[
                    { key: 'ALL', label: 'All years', href: buildHref({ year: undefined }) },
                    ...years.map((y) => ({ key: String(y), label: String(y), href: buildHref({ year: y }) })),
                  ]}
                />
              )}
            </div>

            {allPapers.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No papers match this selection"
                description={
                  subjectCode
                    ? `Nothing is filed under ${subjectCode} with these filters yet. If you have a copy, upload it and help the next batch.`
                    : 'Try a different semester, exam type or year — or upload the paper you are looking for.'
                }
                action={
                  <>
                    <UploadPaperDialog signedIn={Boolean(user)} />
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={basePath}>Clear filters</Link>
                    </Button>
                  </>
                }
              />
            ) : (
              <>
                <ul className="divide-y divide-line rounded-md border border-line bg-primary">
                  {allPapers.map((paper) => (
                    <PaperRow
                      key={paper.id}
                      paper={paper}
                      bookmarked={bookmarks.has(paper.id)}
                      signedIn={Boolean(user)}
                      showSubject={!activeSubject}
                    />
                  ))}
                </ul>
                {external.length > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-faint">
                    <Badge tone="info" size="xs">PYQ Hub</Badge>
                    Papers mirrored from the standalone PYQ Hub library open there directly.
                  </p>
                )}
                <Pagination
                  className="mt-5"
                  page={papers.page}
                  pageSize={papers.pageSize}
                  total={papers.total}
                  buildHref={(p) => buildHref({ page: p })}
                  itemLabel="papers"
                />
              </>
            )}

            <div className="mt-8 rounded-md border border-dashed border-line-strong bg-tertiary p-4">
              <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <FileText className="size-3.5 text-faint" aria-hidden="true" />
                Spotted a mistake?
              </h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                If a paper is filed under the wrong course, exam or year, report it from the paper&rsquo;s own page and a
                moderator will fix the metadata.
              </p>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
