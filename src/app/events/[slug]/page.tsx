import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import {
  ArrowLeft, CalendarClock, ExternalLink, IndianRupee, Mail, MapPin, Ticket, Users,
} from 'lucide-react';
import { PageBody } from '@/components/layout/page-header';
import { Badge, EventCategoryBadge } from '@/components/ui/badge';
import { EventPoster } from '@/components/media/entity-poster';
import { Alert, Breadcrumbs, MetaRow, Meter, RichText } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { BookmarkButton } from '@/components/content/bookmark-button';
import { ShareButton } from '@/components/content/share-button';
import { ReportButton } from '@/components/content/report-button';
import { RegisterButton } from '@/components/events/register-button';
import { AddToCalendar } from '@/components/events/add-to-calendar';
import { EventCard } from '@/components/content/event-card';
import { ClubAvatar } from '@/components/content/club-card';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbJsonLd, eventJsonLd, pageMetadata } from '@/lib/metadata';
import { formatCount, formatCountdown, formatEventWindow, formatInr, humanise } from '@/lib/format';
import { getEventBySlug, incrementEventView, listEvents } from '@/server/db/repositories/events';
import { getRegistration, isBookmarked } from '@/server/db/repositories/engagement';
import { trackSafe } from '@/server/db/repositories/analytics';
import { currentVisitorHash } from '@/server/actions/_shared';
import { getSessionUser } from '@/server/auth/session';
import { siteUrl } from '@/lib/env';

/** Event detail: everything needed to decide whether to go, and to register. */

export const revalidate = 180;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== 'PUBLISHED') {
    return pageMetadata({ title: 'Event not found', description: 'This event is not available.', path: `/events/${slug}`, noIndex: true });
  }
  return pageMetadata({
    title: event.title,
    description: event.summary,
    path: `/events/${event.slug}`,
    type: 'article',
    image: event.posterUrl,
    tags: event.tags,
  });
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== 'PUBLISHED') notFound();

  const user = await getSessionUser();
  const now = Date.now();

  const [bookmarked, registration, more] = await Promise.all([
    user ? isBookmarked(user.id, 'EVENT', event.id) : Promise.resolve(false),
    user ? getRegistration(user.id, event.id) : Promise.resolve(null),
    listEvents({
      window: 'upcoming',
      pageSize: 3,
      ...(event.clubId ? { clubId: event.clubId } : { category: event.category }),
    }),
  ]);


  // The visitor hash is derived from request headers, which Next.js forbids
  // reading inside after(). Resolve it here and close over the value.
  const visitorHash = await currentVisitorHash();

  after(async () => {
    await incrementEventView(event.id);
    await trackSafe({
      name: 'event_view',
      path: `/events/${event.slug}`,
      entityId: event.id,
      visitorHash,
      meta: { category: event.category },
    });
  });

  const past = Date.parse(event.endsAt) < now;
  const seatsLeft = event.seats === null ? null : Math.max(0, event.seats - event.seatsTaken);
  const registrationClosed = Boolean(
    event.registrationDeadline && Date.parse(event.registrationDeadline) < now,
  );
  const related = more.items.filter((e) => e.id !== event.id).slice(0, 2);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
    { label: event.title },
  ];

  return (
    <>
      <JsonLd
        data={eventJsonLd({
          name: event.title,
          description: event.summary,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          venue: event.venue,
          url: `${siteUrl}/events/${event.slug}`,
          organiser: event.club?.name ?? event.organiser,
          isFree: !event.isPaid,
        })}
      />
      <JsonLd data={breadcrumbJsonLd([{ label: 'Home', href: '/' }, { label: 'Events', href: '/events' }])} />

      <PageBody>
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_330px]">
          <article className="min-w-0">
            <Breadcrumbs items={breadcrumbs} />

            {/* The poster, sized to sit beside the title on a wide screen and
                above it on a narrow one — the way a printed bill would. */}
            <EventPoster
              event={event}
              ratio="wide"
              linked={false}
              className="mb-5 border border-line shadow-sm sm:hidden"
            />

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <EventCategoryBadge category={event.category} size="sm" />
              {event.featured && <Badge tone="brand" size="xs">Featured</Badge>}
              {past && <Badge tone="neutral" size="xs">Finished</Badge>}
              {event.isPaid ? (
                <Badge tone="warning" size="xs">{formatInr(event.feeInr)}</Badge>
              ) : (
                <Badge tone="success" size="xs">Free</Badge>
              )}
              {event.school && <Badge tone="outline" size="xs">{event.school.replace(/_/g, ' ')}</Badge>}
            </div>

            <h1 className="text-[30px] leading-[1.12] text-ink sm:text-[38px]">{event.title}</h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">{event.summary}</p>

            <dl className="mt-6 grid gap-3 rounded-md border border-line bg-primary p-4 sm:grid-cols-2">
              <Fact icon={CalendarClock} label="When" value={formatEventWindow(event.startsAt, event.endsAt)} />
              <Fact
                icon={MapPin}
                label="Where"
                value={
                  event.location ? (
                    <Link href={`/map?location=${event.location.slug}`} className="hover:underline underline-offset-2">
                      {event.venue}
                    </Link>
                  ) : (
                    event.venue
                  )
                }
              />
              <Fact
                icon={Users}
                label="Organised by"
                value={
                  event.club ? (
                    <Link href={`/clubs/${event.club.slug}`} className="hover:underline underline-offset-2">
                      {event.club.name}
                    </Link>
                  ) : (
                    event.organiser
                  )
                }
              />
              <Fact
                icon={event.isPaid ? IndianRupee : Ticket}
                label="Entry"
                value={
                  event.isPaid
                    ? `${formatInr(event.feeInr)} per participant`
                    : event.registrationRequired
                      ? 'Free — registration required'
                      : 'Free — open entry'
                }
              />
            </dl>

            {past && (
              <Alert tone="neutral" className="mt-5" title="This event has finished">
                It is kept here for reference. Browse{' '}
                <Link href="/events" className="font-medium underline underline-offset-2">
                  upcoming events
                </Link>{' '}
                for what is next.
              </Alert>
            )}

            {!past && registrationClosed && (
              <Alert tone="warning" className="mt-5" title="Registration has closed">
                The registration window ended. You may still be able to attend if it is an open-entry event — check with
                the organisers.
              </Alert>
            )}

            <div className="mt-7">
              <h2 className="mb-3 border-b border-line pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
                About this event
              </h2>
              <RichText text={event.description} />
            </div>

            {event.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/events?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-line-strong bg-primary px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/events">
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  All events
                </Link>
              </Button>
              <ReportButton targetType="EVENT" targetId={event.id} signedIn={Boolean(user)} />
            </div>
          </article>

          {/* ---------------------------------------------------- action rail */}
          <aside className="min-w-0 space-y-6 lg:sticky lg:top-4 lg:self-start">
            <EventPoster
              event={event}
              ratio="portrait"
              linked={false}
              className="hidden border border-line shadow-sm sm:block"
            />

            <section className="rounded-md border border-line-strong bg-primary p-4 shadow-sm">
              {event.registrationRequired && !past ? (
                <>
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Registration</p>
                    {seatsLeft !== null ? (
                      <>
                        <p className="vp-numeric mt-1 text-[22px] font-bold leading-none text-ink">
                          {seatsLeft}
                          <span className="ml-1.5 text-[13px] font-medium text-muted">of {event.seats} seats left</span>
                        </p>
                        <Meter
                          className="mt-2.5"
                          value={event.seatsTaken}
                          max={event.seats ?? 1}
                          label={`${event.seatsTaken} of ${event.seats} seats taken`}
                          tone={seatsLeft === 0 ? 'danger' : seatsLeft < (event.seats ?? 0) * 0.2 ? 'warning' : 'brand'}
                        />
                      </>
                    ) : (
                      <p className="mt-1 text-[14px] font-semibold text-ink">Open registration</p>
                    )}
                    {event.registrationDeadline && (
                      <p className="mt-2 text-[12px] text-warning-ink">
                        Closes {formatCountdown(event.registrationDeadline, now)}
                      </p>
                    )}
                  </div>

                  <RegisterButton
                    eventId={event.id}
                    eventSlug={event.slug}
                    signedIn={Boolean(user)}
                    status={registration?.status ?? null}
                    disabled={registrationClosed}
                    full={seatsLeft === 0}
                    externalUrl={event.registrationUrl}
                  />
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted">
                  {past
                    ? 'This event has finished.'
                    : 'No registration needed — turn up at the venue.'}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <AddToCalendar
                  title={event.title}
                  description={event.summary}
                  location={event.venue}
                  startsAt={event.startsAt}
                  endsAt={event.endsAt}
                  slug={event.slug}
                />
                <BookmarkButton
                  targetType="EVENT"
                  targetId={event.id}
                  initial={bookmarked}
                  signedIn={Boolean(user)}
                  withLabel
                  className="justify-center"
                />
              </div>
              <ShareButton title={event.title} path={`/events/${event.slug}`} withLabel className="mt-2 w-full justify-center" />
            </section>

            <section className="rounded-md border border-line bg-primary p-4">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Details</h2>
              <dl className="divide-y divide-line">
                <MetaRow label="Category">{humanise(event.category)}</MetaRow>
                <MetaRow label="Venue">{event.venue}</MetaRow>
                {event.school && <MetaRow label="School">{event.school.replace(/_/g, ' ')}</MetaRow>}
                <MetaRow label="Views">
                  <span className="vp-numeric">{formatCount(event.viewCount)}</span>
                </MetaRow>
                {event.contactEmail && (
                  <MetaRow label="Contact">
                    <a
                      href={`mailto:${event.contactEmail}`}
                      className="inline-flex items-center gap-1 text-link hover:underline underline-offset-2"
                    >
                      <Mail className="size-3" aria-hidden="true" />
                      Email
                    </a>
                  </MetaRow>
                )}
              </dl>
              {event.registrationUrl && (
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-link hover:underline underline-offset-2"
                >
                  External registration form
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </section>

            {event.club && (
              <section className="rounded-md border border-line bg-primary p-4">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Organiser</h2>
                <Link href={`/clubs/${event.club.slug}`} className="group flex items-center gap-3">
                  <ClubAvatar club={event.club} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink group-hover:underline underline-offset-2">
                      {event.club.name}
                    </span>
                    <span className="block text-[11.5px] text-faint">See all their events</span>
                  </span>
                </Link>
              </section>
            )}

            {related.length > 0 && (
              <section>
                <h2 className="mb-2 border-b border-line-strong pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                  You might also like
                </h2>
                <div className="space-y-2">
                  {related.map((item) => (
                    <EventCard key={item.id} event={item} variant="mini" now={now} />
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

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: React.ReactNode;
}) {
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
