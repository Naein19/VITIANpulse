import {
  Bookmark, Building2, CalendarDays, FileText, GraduationCap, Home, LayoutDashboard,
  LibraryBig, MapPin, MessageSquare, Newspaper, Search, Sparkles, Users, PackageSearch,
} from 'lucide-react';

/** Single source of truth for navigation, shared by the header, mobile bar and palette. */

export interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  description?: string;
  /** Marks the item active for any nested route under `href`. */
  matchPrefix?: boolean;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: 'Home', href: '/', icon: Home, description: "Today's campus command centre" },
  { label: 'Campus', href: '/campus', icon: Building2, description: 'Directory, map and services', matchPrefix: true },
  { label: 'Events', href: '/events', icon: CalendarDays, description: 'What is happening and when', matchPrefix: true },
  { label: 'Clubs', href: '/clubs', icon: Users, description: 'Every student organisation', matchPrefix: true },
  { label: 'PYQs', href: '/pyqs', icon: FileText, description: 'Previous year question papers', matchPrefix: true },
  { label: 'Opportunities', href: '/opportunities', icon: Sparkles, description: 'Internships, scholarships, contests', matchPrefix: true },
  { label: 'Resources', href: '/resources', icon: LibraryBig, description: 'Forms, portals and handbooks', matchPrefix: true },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { label: 'News', href: '/news', icon: Newspaper, description: 'The full campus feed', matchPrefix: true },
  { label: 'Discussions', href: '/discussions', icon: MessageSquare, description: 'Student threads', matchPrefix: true },
  { label: 'Lost & Found', href: '/lost-found', icon: PackageSearch, description: 'Report and recover items' },
  { label: 'Campus map', href: '/map', icon: MapPin, description: 'Find any building' },
];

export const ACCOUNT_NAV: readonly NavItem[] = [
  { label: 'My VITPulse', href: '/dashboard', icon: LayoutDashboard, description: 'Your personalised hub' },
  { label: 'Saved', href: '/saved', icon: Bookmark, description: 'Everything you bookmarked' },
  { label: 'Profile', href: '/profile', icon: GraduationCap, description: 'Branch, year and interests' },
];

/** The five destinations on the mobile bottom bar. */
export const MOBILE_NAV: readonly NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Events', href: '/events', icon: CalendarDays, matchPrefix: true },
  { label: 'Search', href: '/search', icon: Search, matchPrefix: true },
  { label: 'PYQs', href: '/pyqs', icon: FileText, matchPrefix: true },
  { label: 'You', href: '/dashboard', icon: LayoutDashboard, matchPrefix: true },
];

export function isNavActive(item: Pick<NavItem, 'href' | 'matchPrefix'>, pathname: string): boolean {
  if (item.href === '/') return pathname === '/';
  return item.matchPrefix ? pathname === item.href || pathname.startsWith(`${item.href}/`) : pathname === item.href;
}
