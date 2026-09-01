import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ExternalLink, GraduationCap } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/ui/tabs';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Alert, Meter } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { pageMetadata } from '@/lib/metadata';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { enumParam, hrefBuilder, type SearchParams } from '@/lib/query-params';
import {
  FALL_2026_FRESHERS, FALL_2026_SENIORS, UNIVERSITY, VERIFIED_ON,
  type AcademicCalendar, type CalendarAudience, type CalendarEntry,
} from '@/data/vitap';

/**
 * The academic calendar.
 *
 * VIT-AP publishes two different calendars for the same semester — the first
 * year batch starts a month later and sits a single CAT instead of two — and
 * the commonest way a fresher gets a date wrong is by reading a senior's copy.
 * So the audience is a first-class switch rather than a footnote, and the
 * chosen one is stated on every screen of the page.
 *
 * The dates are transcribed from the university's own calendar page; nothing
 * here is generated or inferred.
 */

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'Academic calendar',
  description:
    'VIT-AP Fall 2026-27 academic calendar: semester start, CAT and FAT windows, holidays and the last instructional day, for both seniors and the 2026 fresher batch.',
  path: '/calendar',
});

const AUDIENCES: readonly CalendarAudience[] = ['SENIORS', 'FRESHERS'];

const KIND_TONE: Record<CalendarEntry['kind'], BadgeTone> = {
  TERM: 'brand',
  EXAM: 'danger',
  HOLIDAY: 'success',
  EVENT: 'info',
  DEADLINE: 'warning',
};

const KIND_LABEL: Record<CalendarEntry['kind'], string> = {
  TERM: 'Term',
  EXAM: 'Exams',
  HOLIDAY: 'Holiday',
  EVENT: 'Event',
  DEADLINE: 'Deadline',
};

/** Whole days between two ISO dates, positive when `to` is later. */
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

type Phase = 'past' | 'current' | 'upcoming';

function phaseOf(entry: CalendarEntry, today: string): Phase {
  const end = entry.endsOn ?? entry.startsOn;
  if (end < today) return 'past';
  if (entry.startsOn > today) return 'upcoming';
  return 'current';
}

function rangeLabel(entry: CalendarEntry): string {
  if (!entry.endsOn) return formatDate(entry.startsOn);
  return `${formatDate(entry.startsOn)} – ${formatDate(entry.endsOn)}`;
}

/** The month heading an entry belongs under, e.g. "November 2026". */
function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${key}-01T00:00:00Z`),
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const audience = enumParam<CalendarAudience>(params, 'audience', AUDIENCES, 'SENIORS');
  const calendar: AcademicCalendar = audience === 'FRESHERS' ? FALL_2026_FRESHERS : FALL_2026_SENIORS;
  const other = audience === 'FRESHERS' ? FALL_2026_SENIORS : FALL_2026_FRESHERS;

  // Rendered on the server in the campus timezone so "today" means today on
  // campus, not wherever the server happens to run.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const buildHref = hrefBuilder('/calendar', params, { defaults: { audience: 'SENIORS' } });

  const entries = [...calendar.entries].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const current = entries.filter((e) => phaseOf(e, today) === 'current');
  const next = entries.find((e) => phaseOf(e, today) === 'upcoming') ?? null;

  const commencement = entries.find((e) => e.kind === 'TERM') ?? entries[0];
  const lastInstructional = entries.find((e) => e.description.startsWith('Last Instructional day'));
  const theoryFat = entries.find((e) => e.description === 'Theory FAT');
  const exams = entries.filter((e) => e.kind === 'EXAM');

  // Semester progress, measured over the instructional period only — exams are
  // the thing being counted down to, so folding them in would flatter the bar.
  const termStart = commencement?.startsOn ?? null;
  const termEnd = lastInstructional?.startsOn ?? null;
  const termDays = termStart && termEnd ? daysBetween(termStart, termEnd) : 0;
  const elapsed = termStart ? Math.max(0, Math.min(termDays, daysBetween(termStart, today))) : 0;

  const months = entries.reduce<Array<{ key: string; items: CalendarEntry[] }>>((acc, entry) => {
    const key = monthKey(entry.startsOn);
    const bucket = acc.find((m) => m.key === key);
    if (bucket) bucket.items.push(entry);
    else acc.push({ key, items: [entry] });
    return acc;
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={`${calendar.semester} ${calendar.academicYear}`}
        title="Academic calendar"
        description={
          <>
            Semester dates, CAT and FAT windows, holidays and the last instructional day — straight from the
            university&rsquo;s published calendar.
          </>
        }
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Calendar' }]}
        action={
          <Button variant="secondary" asChild>
            <a href={calendar.sourceUrl} target="_blank" rel="noreferrer noopener">
              Official calendar
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        }
      >
        <FilterChips
          label="Which calendar"
          activeKey={audience}
          items={[
            { key: 'SENIORS', label: 'Seniors (2025 batch and earlier)', href: buildHref({ audience: 'SENIORS' }) },
            { key: 'FRESHERS', label: 'Freshers (2026 batch)', href: buildHref({ audience: 'FRESHERS' }) },
          ]}
        />
      </PageHeader>

      <PageBody>
        <Alert tone="warning" className="mb-6">
          <p>
            You are looking at the{' '}
            <strong>{audience === 'FRESHERS' ? 'first-year (2026 batch)' : 'senior batch'}</strong> calendar.{' '}
            {audience === 'FRESHERS'
              ? 'Freshers start a month later than seniors and sit one CAT instead of two.'
              : 'The 2026 fresher batch follows different dates.'}{' '}
            <Link href={buildHref({ audience: other.audience })} className="font-medium underline underline-offset-2">
              Switch to the {other.audience === 'FRESHERS' ? 'freshers' : 'seniors'} calendar
            </Link>
            .
          </p>
        </Alert>

        {/* ------------------------------------------------------ at a glance */}
        <section aria-labelledby="glance" className="mb-7">
          <h2 id="glance" className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            Where the semester stands
          </h2>

          <div className="rounded-md border border-line bg-primary p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-muted">
                {commencement ? formatDate(commencement.startsOn) : '—'} → {lastInstructional ? formatDate(lastInstructional.startsOn) : '—'}
              </p>
              <p className="font-mono text-[12px] text-faint">
                {termDays > 0 ? `day ${elapsed} of ${termDays}` : 'instructional period'}
              </p>
            </div>
            <Meter
              className="mt-2.5"
              value={elapsed}
              max={Math.max(1, termDays)}
              label="Progress through the instructional period"
            />

            <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <Highlight
                label={current.length > 0 ? 'Happening now' : 'Nothing scheduled today'}
                entries={current}
                today={today}
                emptyText="No calendar entry covers today — a normal instructional day."
              />
              <Highlight label="Next up" entries={next ? [next] : []} today={today} emptyText="Nothing further this semester." />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- exam windows */}
        <section aria-labelledby="exams" className="mb-7">
          <h2 id="exams" className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            Assessment windows
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {exams.map((exam) => {
              const phase = phaseOf(exam, today);
              const away = daysBetween(today, exam.startsOn);
              return (
                <div
                  key={exam.description}
                  className={cn(
                    'rounded-md border p-3.5',
                    phase === 'current' ? 'border-danger/40 bg-danger-soft' : 'border-line bg-primary',
                    phase === 'past' && 'opacity-60',
                  )}
                >
                  <p className="text-[13.5px] font-semibold text-ink">{exam.description}</p>
                  <p className="mt-1 text-[12.5px] text-muted">{rangeLabel(exam)}</p>
                  <p className="mt-2 font-mono text-[11.5px] text-faint">
                    {phase === 'past' ? 'completed' : phase === 'current' ? 'in progress' : `in ${away} days`}
                  </p>
                </div>
              );
            })}
          </div>
          {theoryFat && (
            <p className="mt-2.5 text-[12px] text-faint">
              The detailed Theory FAT timetable is released separately by the Controller of Examinations.
            </p>
          )}
        </section>

        {/* --------------------------------------------------------- timeline */}
        <section aria-labelledby="timeline">
          <h2 id="timeline" className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            {calendar.title}
          </h2>

          <div className="space-y-6">
            {months.map((month) => (
              <div key={month.key}>
                <h3 className="sticky top-0 z-10 -mx-1 mb-2 bg-secondary/90 px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint backdrop-blur">
                  {monthLabel(month.key)}
                </h3>
                <ol className="overflow-hidden rounded-md border border-line bg-primary">
                  {month.items.map((entry) => {
                    const phase = phaseOf(entry, today);
                    return (
                      <li
                        key={`${entry.startsOn}-${entry.description}`}
                        className={cn(
                          'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-3.5 py-2.5 last:border-b-0',
                          phase === 'current' && 'bg-brand-soft/40',
                          phase === 'past' && 'opacity-55',
                        )}
                      >
                        <span className="w-[132px] shrink-0 font-mono text-[12px] text-muted">{rangeLabel(entry)}</span>
                        <span className="min-w-0 flex-1 text-[13.5px] text-ink">
                          {entry.description}
                          {entry.remark && <span className="ml-2 text-[12px] text-faint">{entry.remark}</span>}
                        </span>
                        <Badge tone={KIND_TONE[entry.kind]} size="xs">
                          {KIND_LABEL[entry.kind]}
                        </Badge>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ notes */}
        <section aria-labelledby="notes" className="mt-7">
          <h2 id="notes" className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            The university&rsquo;s own notes
          </h2>
          <ul className="space-y-2 rounded-md border border-line bg-primary p-4 text-[13px] leading-relaxed text-soft">
            {calendar.notes.map((note) => (
              <li key={note} className="flex gap-2.5">
                <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>

        <Alert tone="neutral" className="mt-6">
          Transcribed from {UNIVERSITY.shortName}&rsquo;s published academic calendar and last checked on{' '}
          {formatDate(VERIFIED_ON)}. Dates marked tentative by the university can move — the{' '}
          <a href={calendar.sourceUrl} target="_blank" rel="noreferrer noopener" className="font-medium underline underline-offset-2">
            official calendar page
          </a>{' '}
          is always the authority.
        </Alert>
      </PageBody>
    </>
  );
}

/** A "happening now" / "next up" cell. */
function Highlight({
  label,
  entries,
  today,
  emptyText,
}: {
  label: string;
  entries: readonly CalendarEntry[];
  today: string;
  emptyText: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{label}</p>
      {entries.length === 0 ? (
        <p className="text-[13px] text-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => {
            const away = daysBetween(today, entry.startsOn);
            return (
              <li key={entry.description} className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink">{entry.description}</span>
                  <span className="block text-[12px] text-faint">
                    {rangeLabel(entry)}
                    {away > 0 && ` · in ${away} ${away === 1 ? 'day' : 'days'}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
