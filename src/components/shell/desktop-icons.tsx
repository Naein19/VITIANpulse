'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useWindowState } from './window-state';
import { AppIcon } from './app-icon';
import { ALL_APPS, isAppActive } from './apps';

/**
 * The mobile and tablet desktop.
 *
 * On small screens there is no room for flanking rails, so closing the window
 * reveals a three-column grid of application icons over the wallpaper — the
 * arrangement the reference uses at narrow widths. Opening one launches that
 * section and restores the window.
 *
 * Above `lg` this is hidden: there, the side rails already are the desktop
 * icons and remain visible whether the window is open or closed.
 */
export function DesktopIcons({
  signedIn,
  canAccessAdmin,
}: {
  signedIn: boolean;
  canAccessAdmin: boolean;
}) {
  const pathname = usePathname();
  const { mode, open } = useWindowState();

  if (mode !== 'closed') return null;

  const apps = ALL_APPS.filter((app) => (app.adminOnly ? canAccessAdmin : true));

  return (
    <div className="vp-anim-fade-in absolute inset-0 overflow-y-auto px-3 py-5 lg:hidden">
      <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4">
        {apps.map((app) => {
          const active = isAppActive(app, pathname);
          return (
            <li key={app.id}>
              <Link
                href={app.requiresAuth && !signedIn ? `/login?next=${encodeURIComponent(app.href)}` : app.href}
                onClick={open}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex min-h-[76px] flex-col items-center justify-start gap-1 rounded-md p-1.5 transition-colors',
                  'active:bg-primary/25',
                  active && 'bg-primary/30',
                )}
              >
                <AppIcon icon={app.icon} label={app.label} active={active} size="lg" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
