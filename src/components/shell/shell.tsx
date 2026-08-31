import type { ReactNode } from 'react';
import { AppShell, AppStage, AppWindow } from './app-shell';
import { TopBar, type ShellUser } from './top-bar';
import { SideRail } from './side-rail';
import { DesktopIcons } from './desktop-icons';
import { WindowStateProvider } from './window-state';
import { BottomNav } from '@/components/layout/bottom-nav';
import { DemoBanner } from '@/components/layout/demo-banner';
import { SiteFooter } from '@/components/layout/site-footer';

/**
 * Composes the whole chrome — top bar, wallpaper, flanking rails, desktop icons
 * and the floating window everything renders inside. The single place that owns
 * the shell's structure, so pages stay pure content.
 */
export function Shell({
  user,
  demoMode,
  children,
}: {
  user: ShellUser | null;
  demoMode: boolean;
  children: ReactNode;
}) {
  const signedIn = Boolean(user);

  return (
    <WindowStateProvider>
      <AppShell>
        <TopBar user={user} />
        <AppStage>
          <SideRail side="left" signedIn={signedIn} />
          <SideRail side="right" signedIn={signedIn} />
          <DesktopIcons signedIn={signedIn} canAccessAdmin={user?.canAccessAdmin ?? false} />
          <AppWindow>
            {demoMode && <DemoBanner />}
            <main id="main">{children}</main>
            <SiteFooter />
            {/* Clears the mobile bottom bar, which overlays the window. */}
            <div className="h-[var(--bottomnav-h)] lg:hidden" aria-hidden="true" />
          </AppWindow>
        </AppStage>
        <BottomNav signedIn={signedIn} />
      </AppShell>
    </WindowStateProvider>
  );
}
