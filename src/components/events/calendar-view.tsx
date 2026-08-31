import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { campusDateKey, formatMonthYear, formatTime } from '@/lib/format';
import type { EventWithRelations } from '@/types/domain';

/**
 * Month calendar.
 *
 * Server rendered from real events. Days are laid out on a fixed 7-column grid
 * starting Monday, and each cell lists up to three events with an overflow
 * count. On small screens the grid collapses to a scrollable list of days that
 * actually have something on, because a 7-column month grid is unusable at
 * phone width.
 */
export function CalendarView({
  events,
  year,
  month,
  buildHref,
  today,
}: {
  events: readonly EventWithRelations[];
  year: number;
  month: number;
  buildHref: (overrides: Record<string, string | number | undefined>) => string;
  today: Date;
}) {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // getUTCDay: 0=Sunday. Shift so Monday is column 0.
  const leading = (first.getUTCDay() + 6) % 7;
  const todayKey = campusDateKey(today.toISOString());

  const byDay = new Map<string, EventWithRelations[]>();
  for (const event of events) {
    const key = campusDateKey(event.startsAt);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }

  const cells: Array<{ key: string; day: number | null }> = [
    ...Array.from({ length: leading }, (_, i) => ({ key: `pad-${i}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day };
    }),
  ];
  while (cells.length % 7 !== 0) cells.push({ key: `tail-${cells.length}`, day: null });

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const daysWithEvents = cells.filter((c) => c.day !== null && (byDay.get(c.key)?.length ?? 0) > 0);

  return (
    <div className="rounded-md border border-line bg-primary">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{formatMonthYear(first)}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={buildHref({ year: prev.y, month: prev.m })}
            aria-label="Previous month"
            className="inline-flex size-7 items-center justify-center rounded-sm border border-line-strong text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </Link>
          <Link
            href={buildHref({ year: undefined, month: undefined })}
            className="inline-flex h-7 items-center rounded-sm border border-line-strong px-2.5 text-[12px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            Today
          </Link>
          <Link
            href={buildHref({ year: next.y, month: next.m })}
            aria-label="Next month"
            className="inline-flex size-7 items-center justify-center rounded-sm border border-line-strong text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------- desktop month grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-line bg-tertiary">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div
              key={day}
              className="px-2 py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, index) => {
            const dayEvents = cell.day ? (byDay.get(cell.key) ?? []) : [];
            const isToday = cell.key === todayKey;
            return (
              <div
                key={cell.key}
                className={cn(
                  'min-h-26 border-b border-r border-line p-1.5',
                  index % 7 === 6 && 'border-r-0',
                  index >= cells.length - 7 && 'border-b-0',
                  !cell.day && 'bg-tertiary/50',
                  isToday && 'bg-brand-soft/30',
                )}
              >
                {cell.day && (
                  <>
                    <span
                      className={cn(
                        'vp-numeric mb-1 inline-flex size-5 items-center justify-center rounded-full text-[11.5px] font-semibold',
                        isToday ? 'bg-brand text-brand-fg' : 'text-muted',
                      )}
                    >
                      {cell.day}
                    </span>
                    <ul className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <li key={event.id}>
                          <Link
                            href={`/events/${event.slug}`}
                            title={`${formatTime(event.startsAt)} — ${event.title}`}
                            className="block truncate rounded-[3px] px-1 py-0.5 text-[10.5px] leading-tight transition-colors hover:bg-accent"
                            style={{
                              backgroundColor: `var(--cat-${eventHue(event.category)}-bg)`,
                              color: `var(--cat-${eventHue(event.category)}-fg)`,
                            }}
                          >
                            {formatTime(event.startsAt)} {event.title}
                          </Link>
                        </li>
                      ))}
                      {dayEvents.length > 3 && (
                        <li className="px-1 text-[10px] font-medium text-faint">
                          +{dayEvents.length - 3} more
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------- mobile day list */}
      <div className="md:hidden">
        {daysWithEvents.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing scheduled this month.</p>
        ) : (
          <ul className="divide-y divide-line">
            {daysWithEvents.map((cell) => {
              const dayEvents = byDay.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;
              return (
                <li key={cell.key} className="p-3">
                  <p
                    className={cn(
                      'mb-2 text-[11.5px] font-semibold uppercase tracking-[0.08em]',
                      isToday ? 'text-brand-ink' : 'text-faint',
                    )}
                  >
                    {isToday ? 'Today · ' : ''}
                    {new Intl.DateTimeFormat('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    }).format(new Date(`${cell.key}T06:00:00Z`))}
                  </p>
                  <ul className="space-y-1.5">
                    {dayEvents.map((event) => (
                      <li key={event.id}>
                        <Link href={`/events/${event.slug}`} className="flex items-baseline gap-2.5">
                          <span className="vp-numeric shrink-0 text-[12px] font-medium text-muted">
                            {formatTime(event.startsAt)}
                          </span>
                          <span className="text-[13.5px] leading-snug text-ink hover:underline underline-offset-2">
                            {event.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function eventHue(category: EventWithRelations['category']): string {
  const map: Record<EventWithRelations['category'], string> = {
    TECHNICAL: 'campus',
    CULTURAL: 'guest',
    SPORTS: 'sports',
    WORKSHOP: 'event',
    HACKATHON: 'announcement',
    COMPETITION: 'opportunity',
    GUEST_LECTURE: 'guest',
    CLUB_RECRUITMENT: 'club',
    PLACEMENT: 'placement',
    ACADEMIC: 'academic',
  };
  return map[category];
}
