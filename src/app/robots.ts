import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';

/**
 * Crawl rules.
 *
 * Everything student-facing is indexable. Personal surfaces (dashboard, saved,
 * notifications, profile) and the admin console are excluded — they are also
 * protected server-side; this just keeps them out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/dashboard', '/saved', '/notifications', '/profile', '/login', '/auth/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
