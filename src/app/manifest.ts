import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/metadata';

/**
 * PWA manifest.
 *
 * VITPulse is installable and has an offline fallback page, but it is not an
 * offline-first application — content is server rendered and needs a connection.
 * The service worker caches the shell and the offline page only, and says so.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f1f1ec',
    theme_color: '#101014',
    lang: 'en-IN',
    categories: ['education', 'news', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Events', short_name: 'Events', url: '/events', description: 'Browse campus events' },
      { name: 'PYQ Hub', short_name: 'PYQs', url: '/pyqs', description: 'Previous year question papers' },
      { name: 'My VITPulse', short_name: 'Dashboard', url: '/dashboard', description: 'Your personalised hub' },
      { name: 'Search', short_name: 'Search', url: '/search', description: 'Search everything' },
    ],
  };
}
