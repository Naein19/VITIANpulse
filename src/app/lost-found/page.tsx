import type { Metadata } from 'next';
import Link from 'next/link';
import { PackageSearch, ShieldCheck } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/misc';
import { ReportButton } from '@/components/content/report-button';
import { NewLostFoundDialog } from '@/components/community/new-lost-found';
import { ResolveButton } from '@/components/community/resolve-button';
import { SearchField } from '@/components/content/search-field';
import { pageMetadata } from '@/lib/metadata';
import { formatDate, formatRelative } from '@/lib/format';
import { listLostFound, toPublicLostFound } from '@/server/db/repositories/community';
import { getSessionUser } from '@/server/auth/session';
import { maskContact } from '@/lib/sanitize';
import { enumParam, hrefBuilder, intParam, param, type SearchParams } from '@/lib/query-params';

/**
 * Lost & found.
 *
 * Every listing is moderated before it appears, and contact details are only
 * revealed to signed-in students — anonymous visitors see a masked value. That
 * is deliberate: an open list of names and phone numbers is a scraping target.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Lost & found',
  description: 'Report a lost item or something you found on the VIT-AP campus.',
  path: '/lost-found',
});

const PAGE_SIZE = 24;

export default async function LostFoundPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const kind = enumParam(params, 'kind', ['ALL', 'LOST', 'FOUND'] as const, 'ALL');
  const search = param(params, 'q');
  const page = intParam(params, 'page', 1);

  const user = await getSessionUser();
  const result = await listLostFound({
    page,
    pageSize: PAGE_SIZE,
    status: 'OPEN',
    ...(kind !== 'ALL' ? { kind } : {}),
    ...(search ? { search } : {}),
  });

  const buildHref = hrefBuilder('/lost-found', params, { defaults: { kind: 'ALL', page: '1' } });
  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Campus utility"
        title="Lost & found"
        description="Report something you lost, or something you found. Listings are checked by a moderator before they go live."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Lost & found' }]}
        action={
          <>
            <SearchField placeholder="Search items…" defaultValue={search ?? ''} basePath="/lost-found" />
            <NewLostFoundDialog signedIn={Boolean(user)} />
          </>
        }
      >
        <FilterChips
          label="Listing kind"
          activeKey={kind}
          items={[
            { key: 'ALL', label: 'Everything', href: buildHref({ kind: 'ALL' }) },
            { key: 'LOST', label: 'Lost items', href: buildHref({ kind: 'LOST' }) },
            { key: 'FOUND', label: 'Found items', href: buildHref({ kind: 'FOUND' }) },
          ]}
        />
      </PageHeader>

      <PageBody>
        {!user && (
          <Alert tone="info" className="mb-6" title="Contact details are hidden">
            Sign in with your university account to see how to reach the person who posted. This keeps contact
            information out of reach of scrapers.
          </Alert>
        )}

        {result.items.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Nothing listed right now"
            description={
              search
                ? `Nothing matches “${search}”. Try describing the item differently.`
                : 'No open listings. If you lost something, post it — most items turn up within a few days.'
            }
            action={<NewLostFoundDialog signedIn={Boolean(user)} />}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((item) => {
                const isOwner = user?.id === item.reporterId;
                const publicItem = toPublicLostFound(item);
                return (
                  <article
                    key={item.id}
                    className="flex flex-col rounded-md border border-line bg-primary p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Badge tone={item.kind === 'LOST' ? 'warning' : 'success'} size="xs" dot>
                        {item.kind === 'LOST' ? 'Lost' : 'Found'}
                      </Badge>
                      <time className="ml-auto text-[11.5px] text-faint" dateTime={item.happenedOn}>
                        {formatRelative(item.happenedOn, now)}
                      </time>
                    </div>

                    <h2 className="t-sm-strong leading-snug text-ink">{item.title}</h2>
                    <p className="vp-clamp-3 mt-1.5 text-[12.5px] leading-relaxed text-muted">{item.description}</p>

                    <dl className="mt-3 space-y-1 border-t border-line pt-2.5 text-[12px]">
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-faint">Where</dt>
                        <dd className="text-soft">{item.locationText}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-faint">When</dt>
                        <dd className="text-soft">{formatDate(item.happenedOn)}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-faint">Contact</dt>
                        <dd className="min-w-0 break-all text-soft">
                          {user
                            ? item.contactMethod === 'IN_APP'
                              ? item.contactValue
                              : item.contactValue
                            : publicItem.contactAvailable
                              ? maskContact('hidden@example.com', 'EMAIL')
                              : '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center gap-1 border-t border-line pt-2.5">
                      {isOwner && <ResolveButton itemId={item.id} />}
                      <span className="ml-auto">
                        <ReportButton targetType="LOST_FOUND" targetId={item.id} signedIn={Boolean(user)} label="" />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            <Pagination
              className="mt-6"
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              buildHref={(p) => buildHref({ page: p })}
              itemLabel="listings"
            />
          </>
        )}

        <section className="mt-10 rounded-md border border-line bg-tertiary p-5">
          <h2 className="flex items-center gap-2 t-strong text-ink">
            <ShieldCheck className="size-4 text-faint" aria-hidden="true" />
            Staying safe
          </h2>
          <ul className="mt-2.5 grid gap-2 text-[12.5px] leading-relaxed text-muted sm:grid-cols-2">
            <li>Meet in a public part of campus during the day to hand something over.</li>
            <li>Ask the owner to describe a detail that is not in the listing before returning an item.</li>
            <li>High-value items and ID cards should go to the security control room, not a stranger.</li>
            <li>
              Report anything that looks like a scam.{' '}
              <Link href="/campus?category=SERVICE" className="underline underline-offset-2 hover:text-ink">
                Find the services desk
              </Link>
              .
            </li>
          </ul>
        </section>
      </PageBody>
    </>
  );
}
