'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

/**
 * Window state for the desktop shell.
 *
 * Three states, mirroring a real application window:
 *  - `normal`    the floating panel, with the desktop and its rails visible
 *  - `maximized` the panel fills the whole stage; rails and icons are hidden
 *  - `closed`    the panel is gone and the desktop icons take over
 *
 * Persisted to `sessionStorage` so the state survives navigation between pages
 * (the shell lives in the root layout and remounts on hard loads) without
 * following the student into a brand-new session.
 */

export type WindowMode = 'normal' | 'maximized' | 'closed';

const STORAGE_KEY = 'vitpulse-window-mode';

interface WindowStateValue {
  mode: WindowMode;
  /** True once the stored value has been read, to avoid a first-paint flash. */
  ready: boolean;
  setMode: (mode: WindowMode) => void;
  toggleMaximize: () => void;
  close: () => void;
  open: () => void;
}

const WindowStateContext = createContext<WindowStateValue | null>(null);

export function WindowStateProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<WindowMode>('normal');
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) as WindowMode | null;
      if (stored === 'normal' || stored === 'maximized' || stored === 'closed') setModeState(stored);
    } catch {
      // Private mode or blocked storage — the default is fine.
    }
    setReady(true);
  }, []);

  const setMode = useCallback((next: WindowMode) => {
    setModeState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience, not a requirement.
    }
  }, []);

  const toggleMaximize = useCallback(
    () => setMode(mode === 'maximized' ? 'normal' : 'maximized'),
    [mode, setMode],
  );
  const close = useCallback(() => setMode('closed'), [setMode]);
  const open = useCallback(() => setMode('normal'), [setMode]);

  // Navigating anywhere — a rail icon, the top bar, a link inside a page —
  // reopens a closed window, the way launching an app does.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    setModeState((current) => (current === 'closed' ? 'normal' : current));
  }, [pathname]);

  // Escape restores a maximized window, matching the OS convention.
  useEffect(() => {
    if (mode !== 'maximized') return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Ignore Escape aimed at an open dialog or the command palette.
      if (event.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"]')) return;
      setMode('normal');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, ready, setMode, toggleMaximize, close, open }),
    [mode, ready, setMode, toggleMaximize, close, open],
  );

  return <WindowStateContext.Provider value={value}>{children}</WindowStateContext.Provider>;
}

export function useWindowState(): WindowStateValue {
  const context = useContext(WindowStateContext);
  if (!context) {
    return {
      mode: 'normal',
      ready: true,
      setMode: () => undefined,
      toggleMaximize: () => undefined,
      close: () => undefined,
      open: () => undefined,
    };
  }
  return context;
}
