'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Search, Shield, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LogoMark } from '@/components/brand/logo';
import { Avatar } from '@/components/ui/misc';
import { Dropdown, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown';
import { ThemeToggle } from '@/components/layout/theme';
import { ACCOUNT_NAV, PRIMARY_NAV, SECONDARY_NAV, isNavActive } from '@/components/layout/nav-config';
import { useCommandPalette } from '@/components/layout/command-palette';
import { signOut } from '@/server/actions/auth';

export interface ShellUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  canAccessAdmin: boolean;
  unreadNotifications: number;
}

/**
 * The floating top bar.
 *
 * Reference geometry, measured from the capture: 40px tall, translucent
 * `bg-primary/50` over a 64px backdrop blur, with a left nav group of 28px-tall
 * buttons at `gap-px` and `px-2` carrying 13px/500 labels, and a right cluster
 * of a 30px accent CTA plus 26px icon buttons.
 */
export function TopBar({ user }: { user: ShellUser | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: openPalette } = useCommandPalette();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-200 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-[13px] focus:text-inverse"
      >
        Skip to content
      </a>

      <header className="vp-no-print z-50 shrink-0">
        <div className="relative rounded-md border border-line/60 bg-primary/85 shadow-sm backdrop-blur-[64px] lg:h-[var(--topbar-h)]">
          <div className="mx-auto flex h-[var(--topbar-h)] items-center justify-between px-0.5 transition-all duration-300">
            {/* ------------------------------------------------- left group */}
            <nav className="flex h-full items-center gap-px py-0.5" aria-label="Primary">
              <Link
                href="/"
                aria-label="VITPulse home"
                className="group flex h-7 select-none items-center justify-center rounded-sm px-2 transition-colors hover:bg-accent"
              >
                <LogoMark className="size-6" />
              </Link>

              <ul className="hidden items-center gap-px lg:flex">
                {PRIMARY_NAV.slice(1).map((item) => {
                  const active = isNavActive(item, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          't-nav group flex h-7 select-none items-center justify-between rounded-sm px-2 transition-colors',
                          active ? 'bg-accent text-ink' : 'text-ink/90 hover:bg-accent',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Dropdown
                    label="More sections"
                    trigger={({ toggle, ref, open }) => (
                      <button
                        ref={ref}
                        type="button"
                        onClick={toggle}
                        aria-expanded={open}
                        aria-haspopup="menu"
                        className={cn(
                          't-nav group flex h-7 select-none items-center gap-1 rounded-sm px-2 transition-colors',
                          open ? 'bg-accent text-ink' : 'text-ink/90 hover:bg-accent',
                        )}
                      >
                        More
                        <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <DropdownLabel>Community</DropdownLabel>
                        {SECONDARY_NAV.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={close}
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-soft transition-colors hover:bg-accent hover:text-ink"
                          >
                            <item.icon className="size-3.5 text-faint" aria-hidden="true" />
                            {item.label}
                          </Link>
                        ))}
                      </>
                    )}
                  </Dropdown>
                </li>
              </ul>
            </nav>

            {/* ------------------------------------------------ right group */}
            <div className="flex items-center gap-0.5 py-1">
              <button
                type="button"
                onClick={openPalette}
                className="chrome mr-1 hidden h-8 items-center gap-2 px-2.5 text-[13px] text-muted hover:text-ink sm:flex"
              >
                <Search className="size-3.5" aria-hidden="true" />
                <span className="pr-6">Search</span>
                <kbd className="rounded-[3px] border border-line bg-tertiary px-1 font-mono text-[10px] text-faint">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={openPalette}
                aria-label="Search"
                className="chrome inline-flex size-7 items-center justify-center text-muted hover:text-ink sm:hidden"
              >
                <Search className="size-3.5" aria-hidden="true" />
              </button>

              {user && (
                <Link
                  href="/notifications"
                  aria-label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ''}`}
                  className="chrome relative inline-flex size-7 items-center justify-center text-muted hover:text-ink"
                >
                  <Bell className="size-3.5" aria-hidden="true" />
                  {user.unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold leading-4 text-white">
                      {user.unreadNotifications > 9 ? '9+' : user.unreadNotifications}
                    </span>
                  )}
                </Link>
              )}

              <ThemeToggle className="mx-1 hidden sm:inline-flex" />

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
                        <p className="truncate text-[13px] font-bold text-ink">{user.displayName}</p>
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
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-soft transition-colors hover:bg-accent hover:text-ink"
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
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-soft transition-colors hover:bg-accent hover:text-ink"
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
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red transition-colors hover:bg-red/10"
                        >
                          <LogOut className="size-3.5" aria-hidden="true" />
                          Sign out
                        </button>
                      </form>
                    </>
                  )}
                </Dropdown>
              ) : (
                <Link
                  href="/login"
                  className="t-sm-strong ml-0.5 inline-flex h-7 items-center justify-center rounded-sm bg-yellow px-3 text-black transition-[filter] hover:brightness-95"
                >
                  Sign in
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="chrome ml-0.5 inline-flex size-7 items-center justify-center text-muted hover:text-ink lg:hidden"
              >
                {mobileOpen ? <X className="size-3.5" aria-hidden="true" /> : <Menu className="size-3.5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav
              className="vp-anim-fade-in absolute inset-x-0 top-full z-50 mt-1 rounded-md border border-line bg-primary p-2 shadow-lg lg:hidden"
              aria-label="Mobile sections"
            >
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
                          active ? 'bg-accent text-ink' : 'text-soft hover:bg-accent',
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
          )}
        </div>
      </header>
    </>
  );
}
