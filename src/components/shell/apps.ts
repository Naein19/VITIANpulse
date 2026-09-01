import type { LucideIcon } from 'lucide-react';
import {
  Bookmark, Building2, CalendarClock, CalendarDays, FileText, Home, LayoutDashboard, LibraryBig,
  MapPin, MessageSquare, Newspaper, PackageSearch, Search, Shield, Sparkles, Users,
} from 'lucide-react';

/**
 * The desktop "applications".
 *
 * One entry per major surface. This is the single source for the desktop icon
 * grid, the flanking rails and the window title bar, so a new section appears
 * in all three by adding one row here.
 */

export interface DesktopApp {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Accent hue token used for the icon tile. */
  hue: 'blue' | 'green' | 'orange' | 'lilac' | 'teal' | 'purple' | 'seagreen' | 'yellow' | 'salmon' | 'red';
  description: string;
  /** Marks the app active for any nested route. */
  matchPrefix?: boolean;
  /** Only shown to users who can reach the admin console. */
  adminOnly?: boolean;
  /** Requires a signed-in account; anonymous users are sent to sign-in. */
  requiresAuth?: boolean;
}

export const ALL_APPS: readonly DesktopApp[] = [
  { id: 'home', label: 'Home', href: '/', icon: Home, hue: 'blue', description: "Today's campus command centre" },
  { id: 'events', label: 'Events', href: '/events', icon: CalendarDays, hue: 'orange', description: 'What is on and when', matchPrefix: true },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarClock, hue: 'purple', description: 'Semester dates, CATs and FATs' },
  { id: 'clubs', label: 'Clubs', href: '/clubs', icon: Users, hue: 'lilac', description: 'Every student organisation', matchPrefix: true },
  { id: 'pyqs', label: 'PYQ Hub', href: '/pyqs', icon: FileText, hue: 'teal', description: 'Previous year papers', matchPrefix: true },
  { id: 'opportunities', label: 'Opportunities', href: '/opportunities', icon: Sparkles, hue: 'yellow', description: 'Internships and deadlines', matchPrefix: true },
  { id: 'resources', label: 'Resources', href: '/resources', icon: LibraryBig, hue: 'seagreen', description: 'Forms, portals, handbooks', matchPrefix: true },
  { id: 'news', label: 'News', href: '/news', icon: Newspaper, hue: 'purple', description: 'The full campus feed', matchPrefix: true },
  { id: 'campus', label: 'Campus', href: '/campus', icon: Building2, hue: 'green', description: 'Directory and services', matchPrefix: true },
  { id: 'map', label: 'Campus map', href: '/map', icon: MapPin, hue: 'salmon', description: 'Find any building' },
  { id: 'discussions', label: 'Discussions', href: '/discussions', icon: MessageSquare, hue: 'blue', description: 'Student threads', matchPrefix: true },
  { id: 'lost-found', label: 'Lost & found', href: '/lost-found', icon: PackageSearch, hue: 'orange', description: 'Report and recover items' },
  { id: 'search', label: 'Search', href: '/search', icon: Search, hue: 'seagreen', description: 'Search everything', matchPrefix: true },
  { id: 'saved', label: 'Saved', href: '/saved', icon: Bookmark, hue: 'lilac', description: 'Your bookmarks', requiresAuth: true },
  { id: 'dashboard', label: 'My VITPulse', href: '/dashboard', icon: LayoutDashboard, hue: 'teal', description: 'Your personalised hub', matchPrefix: true, requiresAuth: true },
  { id: 'admin', label: 'Admin', href: '/admin', icon: Shield, hue: 'red', description: 'Console', matchPrefix: true, adminOnly: true },
];

/** The shortcuts on each flanking rail, split left and right. */
export const LEFT_RAIL_APPS = ALL_APPS.filter((a) =>
  ['home', 'campus', 'events', 'calendar', 'clubs', 'pyqs', 'map'].includes(a.id),
);

export const RIGHT_RAIL_APPS = ALL_APPS.filter((a) =>
  ['opportunities', 'resources', 'discussions', 'lost-found', 'saved', 'dashboard'].includes(a.id),
);

export function isAppActive(app: Pick<DesktopApp, 'href' | 'matchPrefix'>, pathname: string): boolean {
  if (app.href === '/') return pathname === '/';
  return app.matchPrefix ? pathname === app.href || pathname.startsWith(`${app.href}/`) : pathname === app.href;
}

/** The most specific app matching a path — used for the window title. */
export function appForPath(pathname: string): DesktopApp | undefined {
  const matches = ALL_APPS.filter((app) => isAppActive(app, pathname));
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

/** Tailwind-safe tile classes per hue, since class names cannot be built at runtime. */
export const HUE_TILE: Record<DesktopApp['hue'], string> = {
  blue: 'bg-blue/15 text-blue border-blue/30',
  green: 'bg-green/15 text-green border-green/30',
  orange: 'bg-orange/15 text-orange border-orange/30',
  lilac: 'bg-lilac/15 text-lilac border-lilac/30',
  teal: 'bg-teal/15 text-teal border-teal/30',
  purple: 'bg-purple/15 text-purple border-purple/30',
  seagreen: 'bg-seagreen/15 text-seagreen border-seagreen/30',
  yellow: 'bg-yellow/15 text-yellow border-yellow/30',
  salmon: 'bg-salmon/15 text-salmon border-salmon/30',
  red: 'bg-red/15 text-red border-red/30',
};
