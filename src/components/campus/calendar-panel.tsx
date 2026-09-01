import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { FALL_2026_FRESHERS, FALL_2026_SENIORS, type CalendarEntry } from '@/data/vitap';

/**
 * "Next on the academic calendar".
 *
 * Real university dates alongside the demo feed, kept visually distinct from
 * club content so the two are never confused. First-years follow a different
 * calendar, so the viewer's academic year picks which one is shown; anonymous
 * visitors get the senior calendar, which the page states.
 */

const KIND_TONE: Record<CalendarEntry['kind'], BadgeTone> = {
  TERM: 'brand',
  EXAM: 'danger',
  HOLIDAY: 'success',
  EVENT: 'info',
  DEADLINE: 'warning',
};

function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function CalendarPanel({
  year,
  limit = 4,
  className,
}: {
  /** The viewer's academic year, used only to choose fresher vs senior dates. */
  year?: number | null;
  limit?: number;
  className?: string;
}) {
  const isFresher = year === 1;
  const calendar = isFresher ? FALL_2026_FRESHERS : FALL_2026_SENIORS;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const upcoming = [...calendar.entries]
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .filter((entry) => (entry.endsOn ?? entry.startsOn) >= today)
    .slice(0, limit);

  return (
    <section className={cn('rounded-md border border-line bg-primary', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          Academic calendar
        </h2>
        <Link href={`/calendar?audience=${isFresher ? 'FRESHERS' : 'SENIORS'}`} className="text-[11.5px] font-medium text-link hover:underline underline-offset-2">
          Full
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="px-3 py-4 text-[12.5px] text-muted">Nothing further on the published calendar.</p>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((entry) => {
            const away = daysUntil(today, entry.startsOn);
            return (
              <li key={`${entry.startsOn}-${entry.description}`} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[13px] font-medium leading-snug text-ink">{entry.description}</p>
                  <Badge tone={KIND_TONE[entry.kind]} size="xs">
                    {entry.kind === 'EXAM' ? 'Exam' : entry.kind === 'HOLIDAY' ? 'Off' : 'Term'}
                  </Badge>
                </div>
                <p className="mt-0.5 font-mono text-[11.5px] text-faint">
                  {formatDate(entry.startsOn)}
                  {entry.endsOn && ` – ${formatDate(entry.endsOn)}`}
                  {away > 0 && ` · in ${away}d`}
                  {away <= 0 && ' · on now'}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t border-line px-3 py-2 text-[11px] leading-relaxed text-faint">
        Real university dates ({isFresher ? '2026 fresher batch' : 'senior batches'}), not demo content.
      </p>
    </section>
  );
}
