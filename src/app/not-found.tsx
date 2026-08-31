import Link from 'next/link';
import { Compass, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRIMARY_NAV } from '@/components/layout/nav-config';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="mb-5 inline-flex size-12 items-center justify-center rounded-md border border-line bg-primary text-faint">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <p className="vp-numeric text-[13px] font-semibold uppercase tracking-[0.16em] text-faint">Error 404</p>
      <h1 className="mt-2 text-[28px] leading-tight text-ink sm:text-[34px]">This page is not on the map</h1>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted">
        The link may be out of date, or the item may have been archived. Try searching, or head to one of the main
        sections below.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/search">
            <Search className="size-3.5" aria-hidden="true" />
            Search VITPulse
          </Link>
        </Button>
      </div>

      <nav aria-label="Main sections" className="mt-10 w-full border-t border-line pt-6">
        <ul className="flex flex-wrap justify-center gap-1.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-primary px-3 py-1.5 text-[12.5px] font-medium text-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <item.icon className="size-3.5 text-faint" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
