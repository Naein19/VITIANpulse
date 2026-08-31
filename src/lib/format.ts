/**
 * Display formatting.
 *
 * Every function is timezone-explicit and deterministic given its inputs, so a
 * server render and the client hydration produce identical strings. `Asia/Kolkata`
 * is the campus timezone and is applied regardless of where the server runs.
 */

export const CAMPUS_TIMEZONE = 'Asia/Kolkata';
export const CAMPUS_LOCALE = 'en-IN';

function fmt(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(CAMPUS_LOCALE, { timeZone: CAMPUS_TIMEZONE, ...options });
}

const dateShort = fmt({ day: 'numeric', month: 'short' });
const dateMedium = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const dateLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeOnly = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const weekdayShort = fmt({ weekday: 'short' });
const monthYear = fmt({ month: 'long', year: 'numeric' });

export function formatDateShort(iso: string): string {
  return dateShort.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateMedium.format(new Date(iso));
}

export function formatDateLong(iso: string): string {
  return dateLong.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeOnly.format(new Date(iso));
}

export function formatWeekday(iso: string): string {
  return weekdayShort.format(new Date(iso));
}

export function formatMonthYear(date: Date): string {
  return monthYear.format(date);
}

export function formatDateTime(iso: string): string {
  return `${dateMedium.format(new Date(iso))} · ${timeOnly.format(new Date(iso))}`;
}

/** "14:00 – 17:00" for a same-day range, otherwise both dates in full. */
export function formatEventWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = dateMedium.format(start) === dateMedium.format(end);
  if (sameDay) return `${dateMedium.format(start)} · ${timeOnly.format(start)} – ${timeOnly.format(end)}`;
  return `${formatDateTime(startIso)} → ${formatDateTime(endIso)}`;
}

const RELATIVE_UNITS: Array<[limitSeconds: number, divisor: number, unit: Intl.RelativeTimeFormatUnit]> = [
  [60, 1, 'second'],
  [3600, 60, 'minute'],
  [86_400, 3600, 'hour'],
  [604_800, 86_400, 'day'],
  [2_592_000, 604_800, 'week'],
  [31_536_000, 2_592_000, 'month'],
  [Number.POSITIVE_INFINITY, 31_536_000, 'year'],
];

const relative = new Intl.RelativeTimeFormat(CAMPUS_LOCALE, { numeric: 'auto', style: 'narrow' });

/** "3h ago", "in 2 days". `now` is injectable to keep rendering deterministic. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diffSeconds = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diffSeconds);
  for (const [limit, divisor, unit] of RELATIVE_UNITS) {
    if (abs < limit) return relative.format(Math.round(diffSeconds / divisor), unit);
  }
  return formatDate(iso);
}

/** Compact countdown for deadlines: "6d left", "4h left", "Closed". */
export function formatCountdown(iso: string, now: number = Date.now()): string {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return 'Closed';
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))}m left`;
  if (hours < 48) return `${Math.round(hours)}h left`;
  return `${Math.round(hours / 24)}d left`;
}

export function isClosingSoon(iso: string, now: number = Date.now(), withinDays = 7): boolean {
  const ms = Date.parse(iso) - now;
  return ms > 0 && ms <= withinDays * 86_400_000;
}

const compactNumber = new Intl.NumberFormat(CAMPUS_LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const plainNumber = new Intl.NumberFormat(CAMPUS_LOCALE);

export function formatCount(value: number): string {
  return value < 1000 ? String(value) : compactNumber.format(value);
}

export function formatNumber(value: number): string {
  return plainNumber.format(value);
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat(CAMPUS_LOCALE, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** Turns SCREAMING_SNAKE enum values into "Screaming snake" for display. */
export function humanise(value: string): string {
  const spaced = value.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Preserves known acronyms while title-casing the rest. */
const ACRONYMS = new Set(['pyq', 'cse', 'ece', 'eee', 'ai', 'ds', 'ml', 'ctf', 'mun', 'cat1', 'cat2', 'fat']);
export function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}

/** Day-of-month grid key used by the calendar view, in campus time. */
export function campusDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
