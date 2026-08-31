'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Wallpaper } from './wallpaper';
import { MobileCloseButton, WindowChrome } from './window-chrome';
import { useWindowState } from './window-state';

/**
 * The desktop shell.
 *
 * Geometry comes from the reference capture: a full-viewport column with 8px of
 * padding, a 40px floating top bar, then a stage that centres the app window.
 * The page never scrolls — the window's own scroll area does.
 *
 * Responsive behaviour:
 *  - below `lg`  the metaphor collapses entirely; the window is full-bleed with
 *                no chrome, no rails and no desktop icons, and the bottom bar
 *                handles navigation
 *  - `lg` and up the full desktop: wallpaper, flanking rails, and a floating
 *                window at 80% x 95% that can be maximized or closed
 */
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="flex h-dvh flex-col overflow-hidden bg-secondary lg:p-[var(--shell-pad)]">{children}</div>;
}

export function AppStage({ children }: { children: ReactNode }) {
  // `isolate` creates a stacking context so the wallpaper's negative z-index
  // stays inside the stage instead of sliding behind the shell background.
  return (
    <div className="relative isolate min-h-0 flex-grow overflow-clip lg:rounded-md">
      <Wallpaper />
      <div className="flex size-full items-center justify-center">{children}</div>
    </div>
  );
}

/**
 * The floating application window.
 *
 * Sized from the captured reference at `w-[80%] h-[95%]` with `rounded-lg` and
 * `shadow-2xl`. Maximizing expands it to fill the stage; closing removes it and
 * reveals the desktop underneath.
 */
export function AppWindow({ children, className }: { children: ReactNode; className?: string }) {
  const { mode, ready } = useWindowState();

  // Closed: the desktop shows through. The icon grid (small screens) and the
  // side rails (large screens) are rendered as siblings by the shell.
  if (mode === 'closed') return null;

  const maximized = mode === 'maximized';

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden bg-primary shadow-2xl',
        // Below `lg` the window is a sheet inset from the edges so the wallpaper
        // still frames it, matching the reference's narrow-width treatment.
        'h-[calc(100%-16px)] w-[calc(100%-16px)] rounded-lg border border-line',
        // The transition makes maximize/restore read as one motion, not a jump.
        ready && 'lg:transition-[width,height,border-radius] lg:duration-300 lg:ease-[cubic-bezier(0.16,1,0.3,1)]',
        maximized
          ? 'lg:h-full lg:w-full lg:rounded-md'
          : 'lg:h-[var(--window-h)] lg:w-[var(--window-w)] lg:rounded-lg',
        className,
      )}
    >
      <WindowChrome />
      <MobileCloseButton />
      <ScrollArea>{children}</ScrollArea>
    </div>
  );
}

function ScrollArea({ children }: { children: ReactNode }) {
  return (
    <div
      id="app-scroll"
      data-app-scroll
      className="vp-scroll-hidden relative size-full flex-1 overflow-y-auto overflow-x-hidden outline-none"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

/** Content container inside the window: `max-w-6xl` centred, captured padding. */
export function WindowContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[var(--content-max)] px-4 pb-16 pt-8 sm:px-6 lg:pt-12', className)}>
      {children}
    </div>
  );
}
