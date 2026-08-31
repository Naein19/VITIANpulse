import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Radio } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EventCategoryBadge } from '@/components/ui/badge';
import { LiveClock, PulseDot } from '@/components/ui/misc';
import { formatCount, formatTime } from '@/lib/format';
import type { EventWithRelations, PostWithRelations } from '@/types/domain';

/**
 * The campus command centre.
 *
 * Deliberately not a marketing hero: it answers "what is happening right now"
 * with a live date block, today's actual schedule and the platform's real
 * counters. Everything on it links to something specific.
 */
export function CommandCentre({
  today,
  urgent,
  stats,
  now,
  greeting,
}: {
  today: readonly EventWithRelations[];
  urgent: PostWithRelations | null;
  stats: { events: number; clubs: number; papers: number; opportunities: number };
  now: Date;
  greeting: string | null;
}) {
  const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(now);
  const dayNumber = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(now);
  const monthYear = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' })
    .format(now)
    .toUpperCase();
  const initialTime = formatTime(now.toISOString());

  return (
    <section className="relative overflow-hidden border-b border-line bg-canvas-alt" aria-labelledby="today-heading">
      <div className="vp-grid-bg vp-fade-b pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

      <div className="relative mx-auto max-w-[var(--vp-shell-max)] px-4 py-8 sm:px-6 sm:py-11">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-12">
          {/* ---------------------------------------------------- date rail */}
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              <PulseDot />
              Live on campus
            </p>

            <h1 id="today-heading" className="sr-only">
              What is happening at VIT-AP today
            </h1>

            <div aria-hidden="true">
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">{weekday}</p>
              <p className="vp-numeric -ml-1 text-[76px] font-extrabold leading-[0.86] tracking-[-0.05em] text-ink sm:text-[92px]">
                {dayNumber}
              </p>
              <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.18em] text-muted">{monthYear}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-faint">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" />
                Amaravati, Andhra Pradesh
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Radio className="size-3.5" aria-hidden="true" />
                <LiveClock initial={initialTime} /> IST
              </span>
            </div>

            {greeting && (
              <p className="mt-5 max-w-xs border-l-2 border-brand pl-3 text-[13.5px] leading-relaxed text-soft">
                {greeting}
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line">
              <Counter label="Upcoming events" value={stats.events} href="/events" />
              <Counter label="Active clubs" value={stats.clubs} href="/clubs" />
              <Counter label="Question papers" value={stats.papers} href="/pyqs" />
              <Counter label="Open opportunities" value={stats.opportunities} href="/opportunities" />
            </dl>
          </div>

          {/* ------------------------------------------------ today's board */}
          <div className="min-w-0">
            {urgent && (
              <Link
                href={`/news/${urgent.slug}`}
                className="mb-4 flex items-start gap-3 rounded-md border border-danger/40 bg-danger-soft px-4 py-3 transition-colors hover:border-danger/70"
              >
                <span className="mt-0.5 shrink-0 rounded-[var(--radius-xs)] bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Urgent
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-snug text-danger-ink">{urgent.title}</span>
                  <span className="vp-clamp-1 mt-0.5 block text-[12.5px] text-danger-ink/80">{urgent.summary}</span>
                </span>
                <ArrowRight className="ml-auto mt-1 size-4 shrink-0 text-danger-ink" aria-hidden="true" />
              </Link>
            )}

            <div className="flex items-baseline justify-between gap-3 border-b border-line-strong pb-2.5">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">Today at VIT-AP</h2>
              <Link
                href="/events?window=today"
                className="text-[12px] font-medium text-muted transition-colors hover:text-ink hover:underline underline-offset-2"
              >
                Full schedule
              </Link>
            </div>

            {today.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
                <CalendarDays className="mx-auto mb-2 size-5 text-faint" aria-hidden="true" />
                <p className="text-[13.5px] font-medium text-ink">Nothing scheduled for today</p>
                <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
                  The campus calendar is clear. Here is what is coming up next.
                </p>
                <Link
                  href="/events"
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand hover:underline underline-offset-2"
                >
                  Browse upcoming events
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <ol className="mt-1 divide-y divide-line">
                {today.map((event) => {
                  const running =
                    Date.parse(event.startsAt) <= now.getTime() && Date.parse(event.endsAt) >= now.getTime();
                  return (
                    <li key={event.id} className="group relative">
                      <Link
                        href={`/events/${event.slug}`}
                        className="flex items-start gap-4 py-3 transition-colors hover:bg-surface"
                      >
                        <span
                          className={cn(
                            'vp-numeric mt-0.5 shrink-0 text-[13px] font-semibold tabular-nums',
                            running ? 'text-[var(--vp-pulse-ink)]' : 'text-muted',
                          )}
                        >
                          {formatTime(event.startsAt)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[14.5px] font-semibold leading-snug text-ink group-hover:underline underline-offset-[3px]">
                              {event.title}
                            </span>
                            {running && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-pulse-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--vp-pulse-ink)]">
                                <PulseDot className="size-1.5" />
                                Now
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-faint">
                            <EventCategoryBadge category={event.category} />
                            <span className="truncate">{event.venue}</span>
                            <span className="truncate">{event.club?.shortName ?? event.organiser}</span>
                          </span>
                        </span>
                        <ArrowRight
                          className="mt-1 size-4 shrink-0 -translate-x-1 text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Counter({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="group bg-canvas-alt px-3.5 py-3 transition-colors hover:bg-surface">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">{label}</dt>
      <dd className="vp-numeric mt-1 text-[24px] font-bold leading-none tracking-tight text-ink">
        {formatCount(value)}
      </dd>
    </Link>
  );
}
