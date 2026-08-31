'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { MOBILE_NAV, isNavActive } from './nav-config';

/**
 * Mobile bottom navigation.
 *
 * Five destinations, 44px+ touch targets, and safe-area padding so it clears the
 * home indicator on iOS. Hidden from `md` up, where the header nav takes over.
 */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  // The admin console has its own dense navigation; the student bar would only
  // get in the way there.
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav
      className="vp-no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary mobile"
    >
      <ul className="mx-auto flex h-[var(--vp-bottomnav-h)] max-w-lg items-stretch">
        {MOBILE_NAV.map((item) => {
          const href = item.href === '/dashboard' && !signedIn ? '/login' : item.href;
          const active = isNavActive(item, pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
                  active ? 'text-brand' : 'text-faint hover:text-muted',
                )}
              >
                <item.icon className={cn('size-[19px]', active && 'stroke-[2.3]')} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
