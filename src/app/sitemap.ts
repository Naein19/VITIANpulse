import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { listPosts } from '@/server/db/repositories/posts';
import { listEvents } from '@/server/db/repositories/events';
import { listClubs } from '@/server/db/repositories/clubs';
import { listOpportunities, pyqBranchSummary } from '@/server/db/repositories/catalog';

/** Sitemap covering every publicly indexable route. Revalidated hourly. */

export const revalidate = 3600;

const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/campus', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/news', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/events', changeFrequency: 'daily', priority: 0.9 },
  { path: '/clubs', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/pyqs', changeFrequency: 'daily', priority: 0.9 },
  { path: '/opportunities', changeFrequency: 'daily', priority: 0.9 },
  { path: '/resources', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/discussions', changeFrequency: 'daily', priority: 0.6 },
  { path: '/lost-found', changeFrequency: 'daily', priority: 0.5 },
  { path: '/map', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/search', changeFrequency: 'monthly', priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, events, clubs, opportunities, branches] = await Promise.all([
    listPosts({ pageSize: 50 }),
    listEvents({ window: 'all', pageSize: 60 }),
    listClubs({ pageSize: 60 }),
    listOpportunities({ pageSize: 50, includeClosed: true }),
    pyqBranchSummary(),
  ]);

  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...posts.items.map((post) => ({
      url: `${siteUrl}/news/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: post.importance === 'NORMAL' ? 0.6 : 0.8,
    })),
    ...events.items.map((event) => ({
      url: `${siteUrl}/events/${event.slug}`,
      lastModified: new Date(event.updatedAt),
      changeFrequency: 'daily' as const,
      priority: Date.parse(event.endsAt) > now.getTime() ? 0.8 : 0.4,
    })),
    ...clubs.items.map((club) => ({
      url: `${siteUrl}/clubs/${club.slug}`,
      lastModified: new Date(club.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...opportunities.items.map((opportunity) => ({
      url: `${siteUrl}/opportunities/${opportunity.slug}`,
      lastModified: new Date(opportunity.updatedAt),
      changeFrequency: 'daily' as const,
      priority: Date.parse(opportunity.deadline) > now.getTime() ? 0.8 : 0.3,
    })),
    ...branches.map((branch) => ({
      url: `${siteUrl}/pyqs/${branch.branch.toLowerCase()}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
