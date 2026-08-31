import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/providers';
import { CommandPaletteProvider } from '@/components/layout/command-palette';
import { SiteHeader } from '@/components/layout/site-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import { DemoBanner } from '@/components/layout/demo-banner';
import { themeScript } from '@/components/layout/theme';
import { baseMetadata } from '@/lib/metadata';
import { getSessionUser } from '@/server/auth/session';
import { canAccessAdmin } from '@/server/auth/rbac';
import { countUnreadNotifications } from '@/server/db/repositories/engagement';
import { isDemoMode } from '@/server/db';
import { AnalyticsBeacon } from '@/components/analytics/beacon';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  // Only the weights the design system actually uses, keeping the payload small.
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f1ec' },
    { media: '(prefers-color-scheme: dark)', color: '#101014' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const unread = user ? await countUnreadNotifications(user.id) : 0;

  return (
    <html lang="en-IN" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <Providers>
          <CommandPaletteProvider>
            {isDemoMode() && <DemoBanner />}
            <SiteHeader
              user={
                user
                  ? {
                      id: user.id,
                      displayName: user.displayName,
                      username: user.username,
                      avatarUrl: user.avatarUrl,
                      role: user.role,
                      canAccessAdmin: canAccessAdmin(user.role),
                      unreadNotifications: unread,
                    }
                  : null
              }
            />
            <main id="main" className="min-h-[60vh] pb-[calc(var(--vp-bottomnav-h)+16px)] md:pb-0">
              {children}
            </main>
            <SiteFooter />
            <BottomNav signedIn={Boolean(user)} />
            <AnalyticsBeacon />
          </CommandPaletteProvider>
        </Providers>
      </body>
    </html>
  );
}
