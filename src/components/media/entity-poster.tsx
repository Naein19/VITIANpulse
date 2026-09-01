import Link from 'next/link';
import { CalendarClock, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Poster, type PosterHue, type PosterRatio } from './poster';
import { CLUB_CATEGORY_VAR, EVENT_CATEGORY_VAR } from '@/components/ui/badge';
import { formatDateShort, formatTime, humanise } from '@/lib/format';
import type { Club, EventWithRelations } from '@/types/domain';

/**
 * Entity posters.
 *
 * Thin wrappers that decide the palette and the caption for each kind of
 * content, so callers never hand-roll a seed or a hue. An event poster leads
 * with the date because that is what a student is scanning for; a club poster
 * leads with the short name because that is what they recognise.
 */

export function EventPoster({
  event,
  ratio = 'portrait',
  linked = true,
  className,
}: {
  event: EventWithRelations;
  ratio?: PosterRatio;
  linked?: boolean;
  className?: string;
}) {
  const hue = (EVENT_CATEGORY_VAR[event.category] ?? 'event') as PosterHue;
  const poster = (
    <Poster
      seed={`event:${event.slug}`}
      hue={hue}
      title={event.title}
      eyebrow={`${formatDateShort(event.startsAt)} · ${formatTime(event.startsAt)}`}
      footnote={event.club?.name ?? event.organiser}
      imageUrl={event.posterUrl}
      imageAlt={event.posterAlt}
      ratio={ratio}
      className={className}
    />
  );

  if (!linked) return poster;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group/poster block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
      aria-label={event.title}
    >
      <span className="block overflow-hidden rounded-md border border-line transition-[transform,box-shadow] duration-200 group-hover/poster:-translate-y-0.5 group-hover/poster:shadow-md">
        {poster}
      </span>
    </Link>
  );
}

/**
 * A poster card: the artwork plus the two lines a student needs to decide
 * whether to care. Used on the events poster wall.
 */
export function EventPosterCard({ event }: { event: EventWithRelations }) {
  return (
    <article className="min-w-0">
      <EventPoster event={event} ratio="portrait" />
      <div className="mt-2">
        <h3 className="vp-clamp-2 text-[13px] font-semibold leading-snug text-ink">
          <Link href={`/events/${event.slug}`} className="hover:underline underline-offset-2">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] text-faint">
          <CalendarClock className="size-3 shrink-0" aria-hidden="true" />
          {formatDateShort(event.startsAt)}
          <span aria-hidden="true">·</span>
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.venue}</span>
        </p>
      </div>
    </article>
  );
}

export function ClubPoster({
  club,
  ratio = 'wide',
  compact = false,
  className,
}: {
  club: Pick<Club, 'slug' | 'name' | 'shortName' | 'category' | 'tagline' | 'bannerUrl'>;
  ratio?: PosterRatio;
  compact?: boolean;
  className?: string;
}) {
  const hue = (CLUB_CATEGORY_VAR[club.category] ?? 'club') as PosterHue;
  return (
    <Poster
      seed={`club:${club.slug}`}
      hue={hue}
      title={club.shortName}
      eyebrow={humanise(club.category)}
      footnote={club.tagline}
      imageUrl={club.bannerUrl}
      imageAlt={null}
      ratio={ratio}
      compact={compact}
      className={cn(className)}
    />
  );
}
