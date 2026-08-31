import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchField } from '@/components/content/search-field';
import { PostCard } from '@/components/content/post-card';
import { pageMetadata } from '@/lib/metadata';
import { humanise } from '@/lib/format';
import { LOCATION_CATEGORIES, type LocationCategory } from '@/types/domain';
import { listLocations } from '@/server/db/repositories/catalog';
import { listPosts } from '@/server/db/repositories/posts';
import { getSessionUser } from '@/server/auth/session';
import { bookmarkedIds } from '@/server/db/repositories/engagement';
import { enumParam, hrefBuilder, param, type SearchParams } from '@/lib/query-params';

/**
 * Campus directory.
 *
 * Every building, facility, department, office and service, searchable by name
 * or purpose, with the campus feed's campus-tagged stories alongside.
 */

export const revalidate = 1800;

export const metadata: Metadata = pageMetadata({
  title: 'Campus directory',
  description:
    'Buildings, facilities, departments, offices and services across the VIT-AP campus with locations, timings and contacts.',
  path: '/campus',
});

export default async function CampusPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const category = enumParam<LocationCategory | 'ALL'>(params, 'category', [...LOCATION_CATEGORIES, 'ALL'], 'ALL');
  const search = param(params, 'q')?.toLowerCase();

  const user = await getSessionUser();
  const [locations, campusNews, bookmarks] = await Promise.all([
    listLocations(),
    listPosts({ category: 'CAMPUS', pageSize: 4 }),
    bookmarkedIds(user?.id ?? null, 'POST'),
  ]);

  const filtered = locations.filter((location) => {
    if (category !== 'ALL' && location.category !== category) return false;
    if (!search) return true;
    return (
      location.name.toLowerCase().includes(search) ||
      location.shortName.toLowerCase().includes(search) ||
      location.description.toLowerCase().includes(search) ||
      location.tags.some((t) => t.includes(search))
    );
  });

  const buildHref = hrefBuilder('/campus', params, { defaults: { category: 'ALL' } });
  const counts = locations.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        eyebrow="Know your campus"
        title="Campus directory"
        description="Where everything is, when it is open, and who to contact."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Campus' }]}
        action={
          <>
            <SearchField placeholder="Search buildings & services…" defaultValue={param(params, 'q') ?? ''} basePath="/campus" />
            <Button variant="secondary" asChild>
              <Link href="/map">
                <MapPin className="size-3.5" aria-hidden="true" />
                Open the map
              </Link>
            </Button>
          </>
        }
      >
        <FilterChips
          label="Location category"
          activeKey={category}
          items={[
            { key: 'ALL', label: 'Everything', href: buildHref({ category: 'ALL' }), count: locations.length },
            ...LOCATION_CATEGORIES.map((c) => ({
              key: c,
              label: humanise(c),
              href: buildHref({ category: c }),
              count: counts[c] ?? 0,
            })),
          ]}
        />
      </PageHeader>

      <PageBody>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {filtered.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="Nothing found on campus"
                description="Try a different category, or search for what you need rather than where it is — for example “ID card” or “ambulance”."
                action={
                  <Button size="sm" variant="secondary" asChild>
                    <Link href="/campus">Show the full directory</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((location) => (
                  <article
                    key={location.id}
                    className="group relative flex flex-col rounded-md border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-[14.5px] font-semibold leading-snug text-ink">
                          <Link
                            href={`/map?location=${location.slug}`}
                            className="after:absolute after:inset-0 hover:underline underline-offset-2"
                          >
                            {location.name}
                          </Link>
                        </h2>
                        <p className="mt-0.5 font-mono text-[11px] text-faint">{location.shortName}</p>
                      </div>
                      <Badge tone="outline" size="xs">{humanise(location.category)}</Badge>
                    </div>

                    <p className="vp-clamp-2 text-[12.5px] leading-relaxed text-muted">{location.description}</p>

                    <dl className="mt-3 space-y-1 border-t border-line pt-2.5 text-[12px] text-faint">
                      {location.timings && (
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">Timings</dt>
                          <Clock className="size-3 shrink-0" aria-hidden="true" />
                          <dd>{location.timings}</dd>
                        </div>
                      )}
                      {location.contact && (
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">Contact</dt>
                          <Phone className="size-3 shrink-0" aria-hidden="true" />
                          <dd>{location.contact}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="min-w-0 space-y-6">
            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">In an emergency</h2>
              <p className="text-[13px] leading-relaxed text-muted">
                The health centre operates around the clock and the security control room can dispatch an ambulance.
              </p>
              <Button variant="secondary" size="sm" className="mt-3 w-full" asChild>
                <Link href="/resources?category=EMERGENCY">
                  Emergency contacts
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </section>

            {campusNews.items.length > 0 && (
              <section>
                <h2 className="mb-1 border-b border-line-strong pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                  Campus updates
                </h2>
                <div>
                  {campusNews.items.map((post) => (
                    <PostCard key={post.id} post={post} variant="compact" bookmarked={bookmarks.has(post.id)} />
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
