import type { Metadata, Viewport } from 'next';
import { Figtree, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/providers';
import { CommandPaletteProvider } from '@/components/layout/command-palette';
import { Shell } from '@/components/shell/shell';
import { themeScript } from '@/components/layout/theme';
import { baseMetadata } from '@/lib/metadata';
import { getSessionUser } from '@/server/auth/session';
import { canAccessAdmin } from '@/server/auth/rbac';
import { countUnreadNotifications } from '@/server/db/repositories/engagement';
import { isDemoMode } from '@/server/db';
import { AnalyticsBeacon } from '@/components/analytics/beacon';

/**
 * Fonts.
 *
 * The reference uses RoundHog (a licensed proprietary face) for UI and Source
 * Code Pro for code. Figtree is the closest open equivalent to RoundHog at the
 * weights the design actually uses — a geometric humanist with slightly rounded
 * terminals — and matches its metrics closely at 13-48px. Source Code Pro is
 * open-licensed and used exactly as the reference does.
 */
const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
  weight: ['400', '500', '600', '700', '800'],
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-code-pro',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eeefe9' },
    { media: '(prefers-color-scheme: dark)', color: '#25262b' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const unread = user ? await countUnreadNotifications(user.id) : 0;

  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${figtree.variable} ${sourceCodePro.variable}`}
    >
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-secondary font-sans text-ink antialiased">
        <Providers>
          <CommandPaletteProvider>
            <Shell
              demoMode={isDemoMode()}
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
            >
              {children}
            </Shell>
            <AnalyticsBeacon />
          </CommandPaletteProvider>
        </Providers>
      </body>
    </html>
  );
}
