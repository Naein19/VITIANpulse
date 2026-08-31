'use client';

import { usePathname } from 'next/navigation';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWindowState } from './window-state';
import { appForPath } from './apps';

/**
 * The window title bar.
 *
 * Two shapes, matching the reference:
 *  - `lg` and up: a full title bar with traffic-light controls and a centred
 *    title that tracks the current route. Double-clicking toggles maximize.
 *  - below `lg`: no bar at all — the sheet gets a single floating close button
 *    instead (see `MobileCloseButton`), because a phone has no window manager.
 */
export function WindowChrome() {
  const pathname = usePathname();
  const { mode, toggleMaximize, close } = useWindowState();
  const app = appForPath(pathname);
  const maximized = mode === 'maximized';

  return (
    <div
      onDoubleClick={toggleMaximize}
      className="hidden h-9 shrink-0 select-none items-center gap-2 border-b border-line bg-tertiary px-2.5 lg:flex"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={close}
          aria-label="Close window"
          title="Close"
          className="group flex size-3 items-center justify-center rounded-full bg-[#f35454] transition-transform hover:scale-110"
        >
          <X className="size-2 text-black/0 transition-colors group-hover:text-black/60" aria-hidden="true" />
        </button>
        <span className="size-3 rounded-full bg-[#eb9d2a] opacity-50" aria-hidden="true" />
        <button
          type="button"
          onClick={toggleMaximize}
          aria-label={maximized ? 'Restore window' : 'Maximise window'}
          aria-pressed={maximized}
          title={maximized ? 'Restore' : 'Maximise'}
          className="group flex size-3 items-center justify-center rounded-full bg-[#6aa84f] transition-transform hover:scale-110"
        >
          {maximized ? (
            <Minimize2 className="size-2 text-black/0 transition-colors group-hover:text-black/60" aria-hidden="true" />
          ) : (
            <Maximize2 className="size-2 text-black/0 transition-colors group-hover:text-black/60" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        {app && <app.icon className="size-3.5 shrink-0 text-faint" aria-hidden="true" />}
        <span className="truncate text-[12px] font-semibold text-soft">
          {app?.label ?? 'VITPulse'}
          <span className="ml-1.5 font-normal text-faint">— VITPulse</span>
        </span>
      </div>

      {/* Balances the control cluster so the title stays optically centred. */}
      <div className="flex w-[52px] justify-end">
        <button
          type="button"
          onClick={toggleMaximize}
          aria-label={maximized ? 'Restore window' : 'Maximise window'}
          className="rounded-sm p-1 text-faint transition-colors hover:bg-accent hover:text-ink"
        >
          {maximized ? (
            <Minimize2 className="size-3.5" aria-hidden="true" />
          ) : (
            <Maximize2 className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * The mobile sheet's close control.
 *
 * Floats over the content in the top-right corner, as the reference does at
 * narrow widths. Closing reveals the icon grid on the wallpaper.
 */
export function MobileCloseButton({ className }: { className?: string }) {
  const { close } = useWindowState();

  return (
    <button
      type="button"
      onClick={close}
      aria-label="Close and show the app grid"
      className={cn(
        'absolute right-2 top-2 z-30 flex size-8 items-center justify-center rounded-full',
        'border border-line/70 bg-primary/90 text-muted shadow-sm backdrop-blur-md',
        'transition-colors hover:text-ink active:scale-95 lg:hidden',
        className,
      )}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}
