import Link from 'next/link';
import { CalendarClock, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, EventCategoryBadge } from '@/components/ui/badge';
import { formatCountdown, formatDateShort, formatTime, formatWeekday, formatInr, formatCount } from '@/lib/format';
import { BookmarkButton } from './bookmark-button';
import type { EventWithRelations } from '@/types/domain';

/**
 * Event card.
 *
 * `grid` is the default browse card; `row` is the dense list/timeline variant;
 * `mini` is for sidebars. All three share one date block so an event is
 * recognisable at any density.
 */
export function EventCard({
  event,
  variant = 'grid',
  bookmarked = false,
  signedIn = false,
  now = Date.now(),
}: {
  event: EventWithRelations;
  variant?: 'grid' | 'row' | 'mini';
  bookmarked?: boolean;
  signedIn?: boolean;
  now?: number;
}) {
  const href = `/events/${event.slug}`;
  const past = Date.parse(event.endsAt) < now;
  const soon = !past && Date.parse(event.startsAt) - now < 48 * 3_600_000;
  const seatsLeft = event.seats === null ? null : Math.max(0, event.seats - event.seatsTaken);
  const full = seatsLeft === 0;

  if (variant === 'mini') {
    return (
      <article className="group relative flex gap-3 border-b border-line py-2.5 last:border-0">
        <DateBlock iso={event.startsAt} compact />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-medium leading-snug text-ink">
            <Link href={href} className="vp-clamp-2 after:absolute after:inset-0 hover:underline underline-offset-2">
              {event.title}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[11.5px] text-faint">
            {formatTime(event.startsAt)} · {event.venue}
          </p>
        </div>
      </article>
    );
  }

  if (variant === 'row') {
    return (
      <article
        className={cn(
          'group relative flex gap-4 rounded-md border border-line bg-surface p-3.5 transition-[border-color,box-shadow] duration-200',
          'hover:border-line-strong hover:shadow-sm',
          past && 'opacity-70',
        )}
      >
        <DateBlock iso={event.startsAt} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <EventCategoryBadge category={event.category} />
            {soon && <Badge tone="pulse" size="xs" dot>Soon</Badge>}
            {full && <Badge tone="warning" size="xs">Full</Badge>}
            {event.isPaid && <Badge tone="outline" size="xs">{formatInr(event.feeInr)}</Badge>}
          </div>
          <h3 className="text-[15px] font-semibold leading-snug text-ink">
            <Link href={href} className="after:absolute after:inset-0 hover:underline underline-offset-[3px]">
              {event.title}
            </Link>
          </h3>
          <p className="vp-clamp-1 mt-1 text-[13px] text-muted">{event.summary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" aria-hidden="true" />
              {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" />
              {event.venue}
            </span>
            {event.club && <span>{event.club.shortName}</span>}
            {seatsLeft !== null && !past && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden="true" />
                {seatsLeft} of {event.seats} left
              </span>
            )}
          </div>
        </div>
        <div className="relative z-1 shrink-0">
          <BookmarkButton targetType="EVENT" targetId={event.id} initial={bookmarked} signedIn={signedIn} size="sm" />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface',
        'transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-md',
        past && 'opacity-75',
      )}
    >
      <div className="relative flex items-start justify-between gap-3 border-b border-line bg-sunken p-3.5">
        <DateBlock iso={event.startsAt} />
        <div className="flex flex-col items-end gap-1.5">
          <EventCategoryBadge category={event.category} />
          {soon && <Badge tone="pulse" size="xs" dot>Starting soon</Badge>}
          {past && <Badge tone="neutral" size="xs">Finished</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-[15.5px] font-semibold leading-snug text-ink">
          <Link href={href} className="after:absolute after:inset-0 hover:underline underline-offset-[3px]">
            {event.title}
          </Link>
        </h3>
        <p className="vp-clamp-2 mt-1.5 text-[13px] leading-relaxed text-muted">{event.summary}</p>

        <dl className="mt-3 space-y-1 text-[12px] text-faint">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Time</dt>
            <CalendarClock className="size-3 shrink-0" aria-hidden="true" />
            <dd>
              {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Venue</dt>
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <dd className="truncate">{event.venue}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Organiser</dt>
            <Users className="size-3 shrink-0" aria-hidden="true" />
            <dd className="truncate">{event.club?.name ?? event.organiser}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center gap-2 border-t border-line pt-2.5 text-[11.5px] text-faint">
          {event.registrationRequired ? (
            full ? (
              <span className="font-medium text-warning-ink">Waitlist only</span>
            ) : seatsLeft !== null ? (
              <span className="vp-numeric font-medium text-ink">{seatsLeft} seats left</span>
            ) : (
              <span>Registration required</span>
            )
          ) : (
            <span>Open entry</span>
          )}
          {event.registrationDeadline && !past && (
            <span className="text-warning-ink">{formatCountdown(event.registrationDeadline, now)}</span>
          )}
          <span className="vp-numeric ml-auto">{formatCount(event.viewCount)} views</span>
          <span className="relative z-1">
            <BookmarkButton targetType="EVENT" targetId={event.id} initial={bookmarked} signedIn={signedIn} size="sm" />
          </span>
        </div>
      </div>
    </article>
  );
}

/** The shared date block: weekday, day number, month. */
export function DateBlock({ iso, compact = false }: { iso: string; compact?: boolean }) {
  const [day, month] = formatDateShort(iso).split(' ');
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center justify-center rounded-sm border border-line bg-raised text-center',
        compact ? 'size-10' : 'size-13 px-1',
      )}
    >
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-faint">{formatWeekday(iso)}</span>
      <span className={cn('vp-numeric font-bold leading-none text-ink', compact ? 'text-[15px]' : 'text-[19px]')}>
        {day}
      </span>
      {!compact && <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-faint">{month}</span>}
    </div>
  );
}
