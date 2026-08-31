'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bell, LogOut, Menu, Search, Shield, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/components/brand/logo';
import { Button, IconButton } from '@/components/ui/button';
import { Avatar, Kbd } from '@/components/ui/misc';
import { Dropdown, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown';
import { ThemeToggle } from './theme';
import { ACCOUNT_NAV, PRIMARY_NAV, SECONDARY_NAV, isNavActive } from './nav-config';
import { useCommandPalette } from './command-palette';
import { signOut } from '@/server/actions/auth';

export interface HeaderUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  canAccessAdmin: boolean;
  unreadNotifications: number;
}

/**
 * The application header.
 *
 * Compact by design: the primary nav is a dense row of links, and everything
 * else (search, notifications, theme, account) lives in a fixed-width control
 * cluster on the right so the layout never reflows as counts change.
 */
export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: openPalette } = useCommandPalette();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-200 focus:rounded-sm focus:bg-brand focus:px-3 focus:py-2 focus:text-[13px] focus:text-[var(--vp-brand-contrast)]"
      >
        Skip to content
      </a>

      <header className="vp-no-print sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-[var(--vp-header-h)] max-w-[var(--vp-shell-max)] items-center gap-3 px-3 sm:px-5">
          <Link href="/" className="shrink-0 rounded-sm" aria-label="VITPulse home">
            <Wordmark />
          </Link>

          <nav className="ml-2 hidden min-w-0 flex-1 items-center lg:flex" aria-label="Primary">
            <ul className="flex items-center gap-0.5">
              {PRIMARY_NAV.slice(1).map((item) => {
                const active = isNavActive(item, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-8 items-center rounded-sm px-2.5 text-[13.5px] font-medium transition-colors duration-150',
                        active ? 'bg-canvas-alt text-ink' : 'text-muted hover:bg-canvas-alt hover:text-ink',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={openPalette}
              className={cn(
                'hidden h-8 items-center gap-2 rounded-sm border border-line-strong bg-surface px-2.5 text-[12.5px] text-faint',
                'transition-colors hover:border-line-heavy hover:text-muted sm:inline-flex',
              )}
            >
              <Search className="size-3.5" aria-hidden="true" />
              <span className="pr-6">Search VITPulse</span>
              <Kbd>⌘K</Kbd>
            </button>
            <IconButton label="Search" size="sm" className="sm:hidden" onClick={openPalette}>
              <Search className="size-4" />
            </IconButton>

            {user && (
              <IconButton label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ''}`} size="sm" asChild>
                <Link href="/notifications" className="relative">
                  <Bell className="size-4" />
                  {user.unreadNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-4 text-white">
                      {user.unreadNotifications > 9 ? '9+' : user.unreadNotifications}
                    </span>
                  )}
                </Link>
              </IconButton>
            )}

            <ThemeToggle className="hidden sm:inline-flex" />

            {user ? (
              <Dropdown
                label="Account menu"
                trigger={({ toggle, ref, open }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    className="ml-0.5 rounded-full transition-opacity hover:opacity-85"
                  >
                    <span className="sr-only">Account menu</span>
                    <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <div className="border-b border-line px-3 pb-2.5 pt-2">
                      <p className="truncate text-[13px] font-semibold text-ink">{user.displayName}</p>
                      <p className="truncate text-[11.5px] text-faint">
                        @{user.username} · {user.role.replace(/_/g, ' ').toLowerCase()}
                      </p>
                    </div>
                    <DropdownLabel>Your space</DropdownLabel>
                    {ACCOUNT_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={close}
                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-soft transition-colors hover:bg-canvas-alt hover:text-ink"
                      >
                        <item.icon className="size-3.5 text-faint" aria-hidden="true" />
                        {item.label}
                      </Link>
                    ))}
                    {user.canAccessAdmin && (
                      <>
                        <DropdownSeparator />
                        <Link
                          href="/admin"
                          role="menuitem"
                          onClick={close}
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-soft transition-colors hover:bg-canvas-alt hover:text-ink"
                        >
                          <Shield className="size-3.5 text-faint" aria-hidden="true" />
                          Admin console
                        </Link>
                      </>
                    )}
                    <DropdownSeparator />
                    <div className="px-3 py-2 sm:hidden">
                      <ThemeToggle />
                    </div>
                    <form action={signOut}>
                      <button
                        type="submit"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-danger-ink transition-colors hover:bg-danger-soft"
                      >
                        <LogOut className="size-3.5" aria-hidden="true" />
                        Sign out
                      </button>
                    </form>
                  </>
                )}
              </Dropdown>
            ) : (
              <Button size="sm" variant="primary" asChild className="ml-0.5">
                <Link href="/login">Sign in</Link>
              </Button>
            )}

            <IconButton
              label={mobileOpen ? 'Close menu' : 'Open menu'}
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </IconButton>
          </div>
        </div>

        {mobileOpen && (
          <div className="vp-anim-fade-in border-t border-line bg-canvas lg:hidden">
            <nav className="mx-auto max-w-[var(--vp-shell-max)] px-3 py-3" aria-label="Mobile">
              <ul className="grid grid-cols-2 gap-1">
                {[...PRIMARY_NAV.slice(1), ...SECONDARY_NAV].map((item) => {
                  const active = isNavActive(item, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center gap-2.5 rounded-sm px-3 py-2 text-[13.5px] font-medium transition-colors',
                          active ? 'bg-brand-soft text-brand-ink' : 'text-soft hover:bg-canvas-alt',
                        )}
                      >
                        <item.icon className="size-4 shrink-0 text-faint" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
