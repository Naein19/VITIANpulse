import type { NextConfig } from 'next';

/**
 * Content Security Policy.
 * `unsafe-inline` on style-src is required by Next's inlined critical CSS.
 * Every third-party origin is listed by name: adding one should be a visible,
 * reviewable change rather than a wildcard nobody notices.
 * Script nonces are not used because Next injects its own bootstrap inline
 * scripts; we instead rely on strict input sanitisation (see src/lib/sanitize.ts)
 * and never render user HTML.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  // tiles.openfreemap.org serves the campus map's vector tiles, style and glyphs.
  // Named explicitly rather than wildcarded so the allowlist stays auditable.
  "connect-src 'self' https://*.supabase.co https://pyqs-hub.vercel.app https://tiles.openfreemap.org",
  // MapLibre runs its tile decoder in a worker created from a blob URL.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // The desktop wallpapers are full-bleed, so only large widths are ever used.
    deviceSizes: [640, 828, 1080, 1200, 1920, 2048, 2560],
    qualities: [75, 85],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: { optimizePackageImports: ['lucide-react', 'date-fns'] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
