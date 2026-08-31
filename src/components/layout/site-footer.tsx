import Link from 'next/link';
import { Wordmark } from '@/components/brand/logo';
import { PRIMARY_NAV, SECONDARY_NAV } from './nav-config';

const COLUMNS: ReadonlyArray<{ title: string; links: ReadonlyArray<{ label: string; href: string }> }> = [
  { title: 'Discover', links: PRIMARY_NAV.slice(1, 5).map(({ label, href }) => ({ label, href })) },
  { title: 'Community', links: SECONDARY_NAV.map(({ label, href }) => ({ label, href })) },
  {
    title: 'Students',
    links: [
      { label: 'My VITPulse', href: '/dashboard' },
      { label: 'Saved items', href: '/saved' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Profile', href: '/profile' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Search', href: '/search' },
      { label: 'Opportunities', href: '/opportunities' },
      { label: 'Resources', href: '/resources' },
      { label: 'Sign in', href: '/login' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="vp-no-print mt-16 border-t border-line bg-tertiary">
      <div className="mx-auto max-w-[var(--content-max)] px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark showTagline />
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-muted">
              A student-built campus platform for VIT-AP. Events, clubs, question papers, opportunities and
              announcements in one place.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="t-label mb-2 text-faint">{column.title}</h2>
              <ul className="space-y-1.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12.5px] text-muted transition-colors hover:text-ink hover:underline underline-offset-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-9 flex flex-col gap-2 border-t border-line pt-5 text-[11.5px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            VITPulse is an independent student project. It is not an official communication channel of the
            university — always confirm critical information with the relevant office.
          </p>
          <p className="shrink-0">Built for VIT-AP · Amaravati</p>
        </div>
      </div>
    </footer>
  );
}
