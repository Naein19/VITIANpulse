import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle, BookOpen, Building, CalendarDays, ClipboardList, ExternalLink, FileSpreadsheet,
  GraduationCap, HeartHandshake, LibraryBig, Link2, ScrollText, Wallet,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/misc';
import { SearchField } from '@/components/content/search-field';
import { ResourceLink } from '@/components/content/resource-link';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { RESOURCE_CATEGORIES, type ResourceCategory } from '@/types/domain';
import { listResources } from '@/server/db/repositories/catalog';
import { bookmarkedIds } from '@/server/db/repositories/engagement';
import { getSessionUser } from '@/server/auth/session';
import { enumParam, hrefBuilder, param, type SearchParams } from '@/lib/query-params';

/** The student resource hub: calendars, forms, portals, handbooks, contacts. */

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: 'Student resources',
  description:
    'Academic calendars, timetables, examination information, forms, university portals, placement material, scholarships, hostel and library guides, student services and emergency contacts for VIT-AP.',
  path: '/resources',
});

const CATEGORY_ICON: Record<ResourceCategory, typeof BookOpen> = {
  ACADEMIC_CALENDAR: CalendarDays,
  TIMETABLE: ClipboardList,
  EXAMINATION: ScrollText,
  FORMS: FileSpreadsheet,
  IMPORTANT_LINKS: Link2,
  PORTALS: Building,
  PLACEMENT: GraduationCap,
  SCHOLARSHIP: Wallet,
  HOSTEL: Building,
  LIBRARY: LibraryBig,
  STUDENT_SERVICES: HeartHandshake,
  EMERGENCY: AlertTriangle,
};

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const category = enumParam<ResourceCategory | 'ALL'>(params, 'category', [...RESOURCE_CATEGORIES, 'ALL'], 'ALL');
  const search = param(params, 'q');

  const user = await getSessionUser();
  const [result, bookmarks] = await Promise.all([
    listResources({
      pageSize: 100,
      ...(category !== 'ALL' ? { category } : {}),
      ...(search ? { search } : {}),
    }),
    bookmarkedIds(user?.id ?? null, 'RESOURCE'),
  ]);

  const buildHref = hrefBuilder('/resources', params, { defaults: { category: 'ALL' } });

  // Group into sections so a long, flat list stays navigable.
  const grouped = new Map<ResourceCategory, typeof result.items>();
  for (const resource of result.items) {
    const list = grouped.get(resource.category) ?? [];
    list.push(resource);
    grouped.set(resource.category, list);
  }
  const sections = RESOURCE_CATEGORIES.filter((c) => grouped.has(c));

  return (
    <>
      <PageHeader
        eyebrow="Everything official"
        title="Student resources"
        description="Calendars, timetables, forms, portals, handbooks and the numbers you need in a hurry — all searchable."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Resources' }]}
        action={<SearchField placeholder="Search resources…" defaultValue={search ?? ''} basePath="/resources" />}
      >
        <FilterChips
          label="Resource category"
          activeKey={category}
          items={[
            { key: 'ALL', label: 'Everything', href: buildHref({ category: 'ALL' }) },
            ...RESOURCE_CATEGORIES.map((c) => ({ key: c, label: humanise(c), href: buildHref({ category: c }) })),
          ]}
        />
      </PageHeader>

      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Jump to section" className="hidden lg:block">
            <div className="sticky top-[calc(var(--vp-header-h)+16px)]">
              <h2 className="mb-2 border-b border-line pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                On this page
              </h2>
              <ul className="space-y-0.5">
                {sections.map((section) => {
                  const Icon = CATEGORY_ICON[section];
                  return (
                    <li key={section}>
                      <a
                        href={`#${section.toLowerCase()}`}
                        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-canvas-alt hover:text-ink"
                      >
                        <Icon className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
                        <span className="truncate">{humanise(section)}</span>
                        <span className="vp-numeric ml-auto text-[11px] text-faint">
                          {grouped.get(section)?.length ?? 0}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          <div className="min-w-0">
            <Alert tone="info" className="mb-6">
              These links point to official university systems and documents. If something is out of date, report it and
              an editor will update it.
            </Alert>

            {result.items.length === 0 ? (
              <EmptyState
                icon={LibraryBig}
                title="No resources match"
                description={
                  search
                    ? `Nothing matches “${search}”. Try a broader term, like "exam" or "hostel".`
                    : 'Try another category, or clear the filter to see the full list.'
                }
                action={
                  <Button size="sm" variant="secondary" asChild>
                    <Link href="/resources">Show all resources</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-9">
                {sections.map((section) => {
                  const items = grouped.get(section) ?? [];
                  const Icon = CATEGORY_ICON[section];
                  const isEmergency = section === 'EMERGENCY';
                  return (
                    <section key={section} id={section.toLowerCase()} className="scroll-mt-20">
                      <h2 className="mb-3 flex items-center gap-2 border-b border-line pb-2.5">
                        <Icon className={isEmergency ? 'size-4 text-danger' : 'size-4 text-faint'} aria-hidden="true" />
                        <span className="text-[15px] font-semibold text-ink">{humanise(section)}</span>
                        <Badge tone={isEmergency ? 'danger' : 'neutral'} size="xs" className="ml-1">
                          {items.length}
                        </Badge>
                      </h2>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {items.map((resource) => (
                          <ResourceLink
                            key={resource.id}
                            resource={resource}
                            bookmarked={bookmarks.has(resource.id)}
                            signedIn={Boolean(user)}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}

            <section className="mt-10 rounded-md border border-dashed border-line-strong bg-sunken p-5">
              <h2 className="text-[15px] font-semibold text-ink">A link is broken or missing?</h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
                Resources are curated by editors. Tell the team what is wrong and it gets fixed for everyone rather than
                just for you.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" asChild>
                <Link href="/discussions?category=CAMPUS">
                  Raise it in discussions
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </section>
          </div>
        </div>
      </PageBody>
    </>
  );
}
