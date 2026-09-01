import Link from 'next/link';
import {
  ArrowRight, Bookmark, Building2, CalendarClock, CalendarDays, FileText,
  LibraryBig, MapPin, MessageSquare, Newspaper, PackageSearch, Sparkles, Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import type { PosterHue } from '@/components/media/poster';

/**
 * The side-scrolling tour of the product.
 *
 * On a wide screen the section pins and the rail travels sideways as you keep
 * scrolling down — the whole effect is one CSS scroll-driven animation
 * (`.vp-pin` / `.vp-rail` in globals.css), so there is no scroll listener, no
 * layout thrash and nothing to hydrate.
 *
 * Where scroll-driven animations are unsupported — and on every narrow screen,
 * where pinning a section is hostile — the same markup is an ordinary
 * horizontal snap scroller. That is the baseline, not the fallback: it works
 * with a swipe, a trackpad, the scrollbar and the keyboard.
 */

interface Stop {
  href: string;
  icon: LucideIcon;
  hue: PosterHue;
  title: string;
  blurb: string;
  metric?: string;
}

export function ScrollRail({
  stats,
}: {
  stats: { events: number; clubs: number; papers: number; opportunities: number; locations: number };
}) {
  const stops: Stop[] = [
    {
      href: '/news', icon: Newspaper, hue: 'announcement',
      title: 'Campus news',
      blurb: 'Notices, results and alerts, ranked so the urgent ones surface first instead of scrolling past.',
    },
    {
      href: '/events', icon: CalendarDays, hue: 'event',
      title: 'Events',
      blurb: 'Workshops, contests, guest lectures and matches — as a list, a calendar or a timeline.',
      metric: `${formatCount(stats.events)} upcoming`,
    },
    {
      href: '/calendar', icon: CalendarClock, hue: 'guest',
      title: 'Academic calendar',
      blurb: 'CAT and FAT windows, holidays and the last instructional day. Freshers and seniors have separate dates — pick yours.',
    },
    {
      href: '/clubs', icon: Users, hue: 'club',
      title: 'Clubs & chapters',
      blurb: 'Every registered club, who is recruiting, and what they actually do.',
      metric: `${formatCount(stats.clubs)} clubs`,
    },
    {
      href: '/pyqs', icon: FileText, hue: 'placement',
      title: 'PYQ Hub',
      blurb: 'Previous year papers by branch, semester and exam — CAT-1, CAT-2, Theory FAT, Lab FAT.',
      metric: `${formatCount(stats.papers)} papers`,
    },
    {
      href: '/opportunities', icon: Sparkles, hue: 'opportunity',
      title: 'Opportunities',
      blurb: 'Internships, hackathons, scholarships and research roles, with the deadline front and centre.',
      metric: `${formatCount(stats.opportunities)} open`,
    },
    {
      href: '/map', icon: MapPin, hue: 'campus',
      title: '3D campus map',
      blurb: 'The real campus from OpenStreetMap, buildings extruded to their real relative heights.',
      metric: `${formatCount(stats.locations)} places`,
    },
    {
      href: '/campus', icon: Building2, hue: 'academic',
      title: 'Campus directory',
      blurb: 'Where everything is, when it opens, and the number to call.',
    },
    {
      href: '/discussions', icon: MessageSquare, hue: 'campus',
      title: 'Discussions',
      blurb: 'Ask the year above you. Threads by branch, subject and hostel.',
    },
    {
      href: '/lost-found', icon: PackageSearch, hue: 'alert',
      title: 'Lost & found',
      blurb: 'Report what you lost, claim what you found, without a hundred-message group.',
    },
    {
      href: '/resources', icon: LibraryBig, hue: 'sports',
      title: 'Resources',
      blurb: 'The forms, portals and handbooks that are otherwise four clicks deep on the university site.',
    },
    {
      href: '/saved', icon: Bookmark, hue: 'guest',
      title: 'Saved',
      blurb: 'Bookmark anything — a paper, an event, a deadline — and find it again in one place.',
    },
  ];

  return (
    <section className="vp-pin relative" aria-labelledby="tour-heading">
      <div className="vp-pin-stage border-y border-line bg-secondary py-10 sm:py-14">
        <div className="mx-auto mb-6 flex max-w-[var(--content-max)] flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">The whole thing</p>
            <h2 id="tour-heading" className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
              Twelve surfaces, one campus
            </h2>
          </div>
          <p className="max-w-[38ch] text-[13px] leading-relaxed text-muted">
            Keep scrolling — the rail moves sideways. Or drag it yourself.
          </p>
        </div>

        <ul className="vp-rail mx-auto max-w-none px-4 sm:px-6">
          {stops.map((stop, i) => (
            <li key={stop.href} className="w-[264px] sm:w-[300px]">
              <Link
                href={stop.href}
                className="group flex h-full flex-col rounded-lg border border-line bg-primary p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
              >
                <span
                  aria-hidden="true"
                  className="mb-4 inline-flex size-11 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `rgb(var(--cat-${stop.hue}-bg))`,
                    color: `rgb(var(--cat-${stop.hue}-fg))`,
                  }}
                >
                  <stop.icon className="size-5" />
                </span>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-1 text-[17px] font-bold leading-snug tracking-[-0.015em] text-ink">{stop.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{stop.blurb}</p>

                <span className={cn('mt-4 flex items-center justify-between gap-2 border-t border-line pt-3')}>
                  {stop.metric ? (
                    <span className="vp-numeric text-[12px] font-semibold text-soft">{stop.metric}</span>
                  ) : (
                    <span className="text-[12px] font-medium text-faint">Open</span>
                  )}
                  <ArrowRight
                    className="size-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
