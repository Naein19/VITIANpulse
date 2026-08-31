'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, CalendarDays, FileText, Flag, LayoutDashboard, Megaphone, Newspaper, Users, UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { can, type Permission } from '@/server/auth/rbac';
import type { Role } from '@/types/domain';

/**
 * Admin navigation.
 *
 * Each item declares the permission it needs, so the menu shows only what this
 * role can actually reach — and the page behind it re-checks anyway.
 */

interface AdminNavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
  countKey?: 'moderation' | 'ads' | 'pyqs' | 'posts';
}

const ITEMS: readonly AdminNavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, permission: 'admin:access' },
  { label: 'Posts', href: '/admin/posts', icon: Newspaper, permission: 'post:edit:any', countKey: 'posts' },
  { label: 'Events', href: '/admin/events', icon: CalendarDays, permission: 'event:edit:any' },
  { label: 'Clubs', href: '/admin/clubs', icon: Users, permission: 'club:approve' },
  { label: 'Ads', href: '/admin/ads', icon: Megaphone, permission: 'ad:review', countKey: 'ads' },
  { label: 'PYQs', href: '/admin/pyqs', icon: FileText, permission: 'pyq:approve', countKey: 'pyqs' },
  { label: 'Moderation', href: '/admin/moderation', icon: Flag, permission: 'moderation:queue', countKey: 'moderation' },
  { label: 'Users', href: '/admin/users', icon: UsersRound, permission: 'user:list' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, permission: 'analytics:view' },
];

export function AdminNav({
  role,
  counts,
}: {
  role: Role;
  counts: Record<'moderation' | 'ads' | 'pyqs' | 'posts', number>;
}) {
  const pathname = usePathname();
  const visible = ITEMS.filter((item) => can(role, item.permission));

  return (
    <nav aria-label="Admin sections" className="min-w-0">
      <div className="lg:sticky lg:top-4">
        <p className="t-label mb-2 border-b border-line pb-2 text-faint">Admin console</p>
        <ul className="vp-scroll-x flex gap-1 pb-1 lg:block lg:space-y-0.5 lg:pb-0">
          {visible.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            const count = item.countKey ? counts[item.countKey] : 0;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] font-medium transition-colors',
                    active ? 'bg-accent text-ink' : 'text-muted hover:bg-accent hover:text-ink',
                  )}
                >
                  <item.icon className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="vp-numeric ml-auto rounded-full bg-red px-1.5 text-[10px] font-bold leading-4 text-white">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 hidden border-t border-line pt-3 text-[11.5px] leading-relaxed text-faint lg:block">
          Signed in as <span className="font-semibold text-muted">{role.replace(/_/g, ' ').toLowerCase()}</span>. Every
          action here is checked on the server and written to the audit log.
        </p>
      </div>
    </nav>
  );
}
