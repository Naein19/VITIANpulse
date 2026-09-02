import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { ArrowLeft, Building2, CalendarX2, ExternalLink, GraduationCap, MapPin, Wallet } from 'lucide-react';
import { PageBody } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Alert, Breadcrumbs, MetaRow, RichText } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { BookmarkButton } from '@/components/content/bookmark-button';
import { ShareButton } from '@/components/content/share-button';
import { OpportunityCard } from '@/components/content/opportunity-card';
import { pageMetadata } from '@/lib/metadata';
import { formatCount, formatCountdown, formatDateLong, humanise, isClosingSoon } from '@/lib/format';
import { getOpportunityBySlug, incrementOpportunityView, listOpportunities } from '@/server/db/repositories/catalog';
import { isBookmarked } from '@/server/db/repositories/engagement';
import { trackSafe } from '@/server/db/repositories/analytics';
import { currentVisitorHash } from '@/server/actions/_shared';
import { getSessionUser } from '@/server/auth/session';

/** A single opportunity, with eligibility front and centre. */

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = await getOpportunityBySlug(slug);
  if (!opportunity || opportunity.status !== 'PUBLISHED') {
    return pageMetadata({ title: 'Opportunity not found', description: 'Not available.', path: `/opportunities/${slug}`, noIndex: true });
  }
  return pageMetadata({
    title: `${opportunity.title} — ${opportunity.organisation}`,
    description: opportunity.summary,
    path: `/opportunities/${opportunity.slug}`,
    type: 'article',
    tags: opportunity.tags,
  });
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const opportunity = await getOpportunityBySlug(slug);
  if (!opportunity || opportunity.status !== 'PUBLISHED') notFound();

  const user = await getSessionUser();
  const now = Date.now();

  const [bookmarked, similar] = await Promise.all([
    user ? isBookmarked(user.id, 'OPPORTUNITY', opportunity.id) : Promise.resolve(false),
    listOpportunities({ type: opportunity.type, pageSize: 3 }),
  ]);


  // The visitor hash is derived from request headers, which Next.js forbids
  // reading inside after(). Resolve it here and close over the value.
  const visitorHash = await currentVisitorHash();

  after(async () => {
    await incrementOpportunityView(opportunity.id);
    await trackSafe({
      name: 'opportunity_click',
      path: `/opportunities/${opportunity.slug}`,
      entityId: opportunity.id,
      visitorHash,
      meta: { type: opportunity.type },
    });
  });

  const closed = Date.parse(opportunity.deadline) < now;
  const urgent = !closed && isClosingSoon(opportunity.deadline, now, 3);
  const related = similar.items.filter((o) => o.id !== opportunity.id).slice(0, 2);

  const eligibleBranches = opportunity.branches.length > 0 ? opportunity.branches : null;
  const matchesBranch = !eligibleBranches || (user?.branch ? eligibleBranches.includes(user.branch) : null);
  const matchesYear =
    opportunity.years.length === 0 || (user?.year ? opportunity.years.includes(user.year) : null);

  return (
    <PageBody>
      <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 max-w-3xl">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Opportunities', href: '/opportunities' },
              { label: opportunity.title },
            ]}
          />

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="brand" size="sm">{humanise(opportunity.type)}</Badge>
            {opportunity.remote && <Badge tone="info" size="xs">Remote</Badge>}
            {urgent && <Badge tone="danger" size="xs" dot>Closing soon</Badge>}
            {closed && <Badge tone="neutral" size="xs">Closed</Badge>}
          </div>

          <h1 className="text-[30px] leading-[1.12] text-ink sm:text-[36px]">{opportunity.title}</h1>
          <p className="mt-2 text-[16px] font-medium text-soft">{opportunity.organisation}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{opportunity.summary}</p>

          <dl className="mt-6 grid gap-3 rounded-md border border-line bg-primary p-4 sm:grid-cols-2">
            <Fact icon={Building2} label="Organisation" value={opportunity.organisation} />
            <Fact icon={MapPin} label="Location" value={opportunity.remote ? `${opportunity.location} · Remote` : opportunity.location} />
            <Fact icon={CalendarX2} label="Deadline" value={`${formatDateLong(opportunity.deadline)} · ${formatCountdown(opportunity.deadline, now)}`} />
            {opportunity.stipend && <Fact icon={Wallet} label="Stipend" value={opportunity.stipend} />}
          </dl>

          {closed && (
            <Alert tone="neutral" className="mt-5" title="Applications have closed">
              This listing is kept for reference.{' '}
              <Link href="/opportunities" className="font-medium underline underline-offset-2">
                Browse what is still open
              </Link>
              .
            </Alert>
          )}

          <section className="mt-7">
            <h2 className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
              <GraduationCap className="size-3.5 text-faint" aria-hidden="true" />
              Eligibility
            </h2>
            <RichText text={opportunity.eligibility} className="text-[14px]" />

            {(eligibleBranches || opportunity.years.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {eligibleBranches?.map((b) => (
                  <Badge key={b} tone={user?.branch === b ? 'success' : 'outline'} size="xs">
                    {b}
                  </Badge>
                ))}
                {opportunity.years.map((y) => (
                  <Badge key={y} tone={user?.year === y ? 'success' : 'outline'} size="xs">
                    Year {y}
                  </Badge>
                ))}
              </div>
            )}

            {user && (matchesBranch === false || matchesYear === false) && (
              <Alert tone="warning" className="mt-3">
                Based on your profile ({user.branch ?? 'branch not set'}, year {user.year ?? '—'}), you may not meet the
                stated eligibility. Check with the organisation before applying.
              </Alert>
            )}
            {user && matchesBranch === true && matchesYear === true && (
              <Alert tone="success" className="mt-3">
                Your branch and year match the stated eligibility.
              </Alert>
            )}
          </section>

          <section className="mt-7">
            <h2 className="mb-3 border-b border-line pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
              Details
            </h2>
            <RichText text={opportunity.description} />
          </section>

          {opportunity.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {opportunity.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/opportunities?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-line-strong bg-primary px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 border-t border-line pt-5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/opportunities">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                All opportunities
              </Link>
            </Button>
          </div>
        </article>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-md border border-line-strong bg-primary p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Deadline</p>
            <p className={`mt-1 text-[20px] font-bold leading-tight ${urgent ? 'text-danger-ink' : closed ? 'text-faint' : 'text-ink'}`}>
              {formatCountdown(opportunity.deadline, now)}
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted">{formatDateLong(opportunity.deadline)}</p>

            <a
              href={opportunity.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm px-4 text-[14px] font-medium transition-colors ${
                closed
                  ? 'pointer-events-none border border-line-strong bg-tertiary text-faint'
                  : 'bg-brand text-brand-fg hover:bg-brand'
              }`}
              aria-disabled={closed}
            >
              {closed ? 'Applications closed' : 'Apply now'}
              {!closed && <ExternalLink className="size-3.5" aria-hidden="true" />}
            </a>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <BookmarkButton
                targetType="OPPORTUNITY"
                targetId={opportunity.id}
                initial={bookmarked}
                signedIn={Boolean(user)}
                withLabel
                className="justify-center"
              />
              <ShareButton title={opportunity.title} path={`/opportunities/${opportunity.slug}`} withLabel className="justify-center" />
            </div>

            <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-faint">
              VITPulse links to the organisation&rsquo;s own application page. Never pay a fee to apply for an internship.
            </p>
          </section>

          <section className="rounded-md border border-line bg-primary p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">At a glance</h2>
            <dl className="divide-y divide-line">
              <MetaRow label="Type">{humanise(opportunity.type)}</MetaRow>
              <MetaRow label="Location">{opportunity.location}</MetaRow>
              <MetaRow label="Mode">{opportunity.remote ? 'Remote' : 'On site'}</MetaRow>
              {opportunity.stipend && <MetaRow label="Stipend">{opportunity.stipend}</MetaRow>}
              <MetaRow label="Views">
                <span className="vp-numeric">{formatCount(opportunity.viewCount)}</span>
              </MetaRow>
            </dl>
          </section>

          {related.length > 0 && (
            <section>
              <h2 className="mb-2 border-b border-line-strong pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                Similar opportunities
              </h2>
              <div>
                {related.map((item) => (
                  <OpportunityCard key={item.id} opportunity={item} variant="mini" now={now} signedIn={Boolean(user)} />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </PageBody>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{label}</dt>
        <dd className="mt-0.5 text-[13.5px] leading-snug text-ink">{value}</dd>
      </div>
    </div>
  );
}
