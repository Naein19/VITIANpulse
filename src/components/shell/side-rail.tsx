'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useWindowState } from './window-state';
import { AppIcon } from './app-icon';
import { LEFT_RAIL_APPS, RIGHT_RAIL_APPS, isAppActive } from './apps';

/**
 * The desktop side rails.
 *
 * Following the reference, these are the desktop's application icons rather
 * than a separate chrome element: they sit directly on the wallpaper and stay
 * put whether the window is open or closed. They hide only when the window is
 * maximized — a full-screen app should have nothing competing with it — and
 * below `lg`, where the mobile icon grid takes over.
 */
export function SideRail({ side, signedIn }: { side: 'left' | 'right'; signedIn: boolean }) {
  const pathname = usePathname();
  const { mode, open } = useWindowState();

  if (mode === 'maximized') return null;

  // The registry is imported here rather than passed in: its entries hold icon
  // components, and functions cannot cross the server/client boundary as props.
  const apps = side === 'left' ? LEFT_RAIL_APPS : RIGHT_RAIL_APPS;

  return (
    <nav
      aria-label={side === 'left' ? 'Campus shortcuts' : 'Student shortcuts'}
      className={cn(
        'vp-no-print vp-anim-fade-in absolute top-1/2 hidden w-[var(--rail-w)] -translate-y-1/2 flex-col gap-1 lg:flex',
        // The icons carry no tile of their own — matching the reference — but
        // the column sits on a feathered scrim. The wallpaper's illustrated
        // side is bright and busy, and a glyph halo alone cannot hold contrast
        // there in dark mode. Blurring as well as dimming keeps it reading as
        // "the desktop recedes behind the dock" rather than as a card.
        'rounded-xl py-2 backdrop-blur-md',
        side === 'left'
          ? 'left-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-transparent'
          : 'right-0 bg-gradient-to-l from-secondary/95 via-secondary/80 to-transparent',
      )}
    >
      {apps.map((app) => {
        const href = app.requiresAuth && !signedIn ? `/login?next=${encodeURIComponent(app.href)}` : app.href;
        const active = isAppActive(app, pathname);
        return (
          <Link
            key={app.id}
            href={href}
            // Following a shortcut while the window is closed reopens it, the
            // way launching an app does.
            onClick={open}
            aria-current={active ? 'page' : undefined}
            title={app.description}
            className={cn(
              'group flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors',
              'hover:bg-primary/25',
              active && 'bg-primary/30',
            )}
          >
            <AppIcon icon={app.icon} label={app.label} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}
