import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, Download, ExternalLink, FileText, Upload } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, Stat } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { PaperRow } from '@/components/pyq/paper-row';
import { UploadPaperDialog } from '@/components/pyq/upload-dialog';
import { pageMetadata } from '@/lib/metadata';
import { formatCount } from '@/lib/format';
import { listPyqPapers, pyqBranchSummary } from '@/server/db/repositories/catalog';
import { bookmarkedIds } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { PYQ_HUB_URL, getPyqHubConnector } from '@/server/integrations/pyq-hub';
import { SearchField } from '@/components/content/search-field';

/**
 * PYQ Hub landing.
 *
 * Entry point for the Branch → Year → Semester → Course → Papers drill-down.
 * Papers come from VITPulse's own moderated catalogue, plus the external PYQ Hub
 * library when that connector is configured (see server/integrations/pyq-hub).
 */

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: 'PYQ Hub — previous year question papers',
  description:
    'Previous year question papers for VIT-AP, organised by branch, semester and course. CAT-1, CAT-2, FAT, quizzes and lab exams.',
  path: '/pyqs',
});

export default async function PyqHubPage() {
  const user = await getSessionUser();
  const [branches, recent, popular, bookmarks] = await Promise.all([
    pyqBranchSummary(),
    listPyqPapers({ sort: 'recent', pageSize: 6 }),
    listPyqPapers({ sort: 'popular', pageSize: 6 }),
    bookmarkedIds(user?.id ?? null, 'PYQ'),
  ]);

  const connector = getPyqHubConnector();
  const totalPapers = branches.reduce((sum, b) => sum + b.papers, 0);
  const totalSubjects = branches.reduce((sum, b) => sum + b.subjects, 0);
  const totalDownloads = popular.items.reduce((sum, p) => sum + p.downloadCount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Exam preparation"
        title="PYQ Hub"
        description="Previous year question papers organised by branch, semester and course. Every paper is reviewed before it appears here."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'PYQs' }]}
        action={
          <>
            <SearchField placeholder="Course code or name…" defaultValue="" basePath="/pyqs/cse" paramName="q" />
            <UploadPaperDialog signedIn={Boolean(user)} />
          </>
        }
      />

      <PageBody>
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <Stat label="Papers available" value={formatCount(totalPapers)} hint="Approved and searchable" />
          <Stat label="Courses covered" value={formatCount(totalSubjects)} hint="Across every branch" />
          <Stat
            label="Downloads"
            value={formatCount(totalDownloads)}
            hint="From the most popular papers"
            tone="brand"
          />
        </div>

        {/* ---------------------------------------------------- branch grid */}
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-[19px] leading-tight text-ink">Start with your branch</h2>
              <p className="mt-1 text-[13px] text-muted">
                Then narrow by semester and course to reach the papers.
              </p>
            </div>
          </div>

          {branches.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No papers yet"
              description="Once papers are uploaded and approved they will be organised here by branch."
              action={<UploadPaperDialog signedIn={Boolean(user)} />}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {branches.map((branch) => (
                <Link
                  key={branch.branch}
                  href={`/pyqs/${branch.branch.toLowerCase()}`}
                  className="group flex items-center justify-between rounded-md border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold tracking-tight text-ink">{branch.branch}</p>
                    <p className="mt-0.5 text-[12px] text-faint">
                      <span className="vp-numeric">{branch.papers}</span> papers ·{' '}
                      <span className="vp-numeric">{branch.subjects}</span> courses
                    </p>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 -translate-x-1 text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* --------------------------------------------- recent and popular */}
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 flex items-center gap-2 border-b border-line pb-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
              <Clock className="size-3.5 text-faint" aria-hidden="true" />
              Recently added
            </h2>
            {recent.items.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">Nothing uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                {recent.items.map((paper) => (
                  <PaperRow key={paper.id} paper={paper} bookmarked={bookmarks.has(paper.id)} signedIn={Boolean(user)} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 border-b border-line pb-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
              <Download className="size-3.5 text-faint" aria-hidden="true" />
              Most downloaded
            </h2>
            {popular.items.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">No downloads recorded yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                {popular.items.map((paper) => (
                  <PaperRow key={paper.id} paper={paper} bookmarked={bookmarks.has(paper.id)} signedIn={Boolean(user)} />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* -------------------------------------------------- hub connection */}
        <section className="mt-10">
          <Alert tone={connector.available ? 'success' : 'neutral'} title="PYQ Hub library">
            <p>{connector.describe()}</p>
            <p className="mt-2">
              The standalone PYQ Hub is still available at{' '}
              <a
                href={PYQ_HUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                pyqs-hub.vercel.app
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
              .
            </p>
          </Alert>
        </section>

        {/* ---------------------------------------------------- contribution */}
        <section className="mt-8 rounded-md border border-dashed border-line-strong bg-sunken p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-lg">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Upload className="size-4 text-faint" aria-hidden="true" />
                Have a paper that is missing?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Upload it as a PDF. An editor checks the course, exam type and year before it goes live, so the library
                stays trustworthy.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="outline" size="xs">PDF only</Badge>
                <Badge tone="outline" size="xs">15 MB max</Badge>
                <Badge tone="outline" size="xs">Reviewed before publishing</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <UploadPaperDialog signedIn={Boolean(user)} />
              <Button variant="secondary" asChild>
                <Link href="/pyqs/cse">Browse CSE papers</Link>
              </Button>
            </div>
          </div>
        </section>
      </PageBody>
    </>
  );
}
