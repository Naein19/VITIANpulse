import Link from 'next/link';
import { cn } from '@/lib/cn';
import { EventCategoryBadge } from '@/components/ui/badge';
import { campusDateKey, formatDateLong, formatTime } from '@/lib/format';
import type { EventWithRelations } from '@/types/domain';

/**
 * Chronological timeline, grouped by day.
 *
 * The variant that answers "what is my week like" — a continuous vertical
 * spine with the day as the anchor, rather than a grid of cards.
 */
export function TimelineView({
  events,
  today,
}: {
  events: readonly EventWithRelations[];
  today: Date;
}) {
  const todayKey = campusDateKey(today.toISOString());

  const groups = new Map<string, EventWithRelations[]>();
  for (const event of events) {
    const key = campusDateKey(event.startsAt);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  return (
    <ol className="relative space-y-8">
      {[...groups.entries()].map(([key, dayEvents]) => {
        const isToday = key === todayKey;
        return (
          <li key={key}>
            <div className="mb-3 flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-bold uppercase tracking-[0.08em]',
                  isToday ? 'bg-brand text-[var(--vp-brand-contrast)]' : 'bg-sunken text-muted',
                )}
              >
                {isToday ? 'Today' : formatDateLong(dayEvents[0]!.startsAt)}
              </span>
              {isToday && (
                <span className="text-[12px] text-muted">{formatDateLong(dayEvents[0]!.startsAt)}</span>
              )}
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
              <span className="vp-numeric text-[11.5px] text-faint">
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            <ol className="ml-2 space-y-0 border-l border-line pl-5">
              {dayEvents.map((event) => (
                <li key={event.id} className="group relative py-2.5">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[calc(1.25rem+4.5px)] top-4 size-2 rounded-full border-2 border-canvas bg-line-strong transition-colors group-hover:bg-brand"
                  />
                  <Link href={`/events/${event.slug}`} className="block">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="vp-numeric text-[12.5px] font-semibold text-muted">
                        {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                      </span>
                      <EventCategoryBadge category={event.category} />
                    </div>
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-ink group-hover:underline underline-offset-[3px]">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-faint">
                      {event.venue} · {event.club?.name ?? event.organiser}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}
