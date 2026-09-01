import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PulseDot } from '@/components/ui/misc';
import { CampusScene } from './campus-scene';
import { formatCount } from '@/lib/format';
import { UNIVERSITY } from '@/data/vitap';

/**
 * Landing banner.
 *
 * Sits above the command centre and does the one job that surface does not:
 * say what this is, to someone who has just arrived. The animated scene behind
 * it is the real campus skyline (see CampusScene), so even the decoration is
 * telling the truth about the place.
 *
 * Headline words fade up in sequence with a CSS stagger — no client component,
 * no JavaScript, and it stops dead under prefers-reduced-motion.
 */

const HEADLINE = ['Everything', 'happening', 'at VIT-AP,', 'in one place.'];

export function LandingHero({
  stats,
  signedIn,
}: {
  stats: { events: number; clubs: number; papers: number; opportunities: number };
  signedIn: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-secondary" aria-labelledby="landing-heading">
      <CampusScene className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] w-full opacity-60" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(var(--bg-secondary))] via-[rgb(var(--bg-secondary))]/88 to-[rgb(var(--bg-secondary))]/45"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-[var(--content-max)] flex-col px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <p className="vp-anim-fade-up mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-line-strong bg-primary/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted backdrop-blur">
          <PulseDot />
          {UNIVERSITY.shortName} · Amaravati
        </p>

        <h1 id="landing-heading" className="max-w-[16ch] text-[38px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[62px]">
          {HEADLINE.map((word, i) => (
            <span
              key={word}
              className="vp-anim-fade-up mr-[0.28em] inline-block"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              {word}
            </span>
          ))}
        </h1>

        <p
          className="vp-anim-fade-up mt-5 max-w-[54ch] text-[16px] leading-relaxed text-soft sm:text-[18px]"
          style={{ animationDelay: '520ms' }}
        >
          Campus news, every club, the full events calendar, previous year papers, internships, the academic
          calendar and a 3D map of the campus — one place, one search, no group chats to scroll.
        </p>

        <div className="vp-anim-fade-up mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: '620ms' }}>
          <Button size="lg" asChild>
            <Link href={signedIn ? '/dashboard' : '/login'}>
              {signedIn ? 'Open your dashboard' : 'Get started'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/map">
              <MapPin className="size-4" aria-hidden="true" />
              Explore the campus in 3D
            </Link>
          </Button>
        </div>

        <dl
          className="vp-anim-fade-up mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4"
          style={{ animationDelay: '720ms' }}
        >
          <Figure value={stats.events} label="Upcoming events" />
          <Figure value={stats.clubs} label="Clubs & chapters" />
          <Figure value={stats.papers} label="Past papers" />
          <Figure value={stats.opportunities} label="Open opportunities" />
        </dl>
      </div>
    </section>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="vp-numeric text-[26px] font-extrabold leading-none tracking-[-0.03em] text-ink sm:text-[32px]">
        {formatCount(value)}
      </dd>
      <p aria-hidden="true" className="mt-1.5 text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
    </div>
  );
}
