'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Theme.
 *
 * Three states — light, dark and system — persisted to localStorage and applied
 * as a class on <html>. The inline script below runs before paint, which stops
 * the flash of the wrong theme on first load.
 *
 * Switching is deliberately gradual rather than instant. Two mechanisms combine:
 *
 *  1. A circular wipe using the View Transitions API, expanding from the point
 *     the user actually clicked, so the new theme sweeps across the page.
 *  2. A `theme-switching` class on <html> for the duration, which turns on
 *     colour transitions across the whole tree. That makes every token —
 *     surfaces, borders, ink, shadows — ease to its new value rather than snap.
 *
 * The class is only present while switching, so ordinary hover and focus
 * transitions keep their own (much shorter) timings. Both mechanisms are
 * skipped entirely under `prefers-reduced-motion`.
 */

export type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'vitpulse-theme';

/** How long the sweep and the colour crossfade run. */
const TRANSITION_MS = 900;

/** Injected into <head>; must stay dependency-free and synchronous. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme, origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** `startViewTransition` is not in the DOM lib yet in every TS release. */
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

function applyClass(theme: Theme): 'light' | 'dark' {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  return dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const clearTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
    setThemeState(stored);
    setResolved(applyClass(stored));
  }, []);

  /** Turns on tree-wide colour transitions, then removes them again. */
  const beginColourCrossfade = useCallback(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => {
      root.classList.remove('theme-switching');
    }, TRANSITION_MS + 120);
  }, []);

  // Follow the OS while on "system".
  useEffect(() => {
    if (theme !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      beginColourCrossfade();
      setResolved(applyClass('system'));
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme, beginColourCrossfade]);

  const setTheme = useCallback(
    (next: Theme, origin?: { x: number; y: number }) => {
      localStorage.setItem(STORAGE_KEY, next);
      setThemeState(next);

      const commit = () => setResolved(applyClass(next));
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const doc = document as DocumentWithViewTransition;

      // Reduced motion, or no View Transitions support: change immediately, but
      // still let the colour tokens ease rather than snap.
      if (reduceMotion || typeof doc.startViewTransition !== 'function') {
        if (!reduceMotion) beginColourCrossfade();
        commit();
        return;
      }

      beginColourCrossfade();
      const transition = doc.startViewTransition(commit);

      void transition.ready.then(() => {
        const x = origin?.x ?? window.innerWidth - 64;
        const y = origin?.y ?? 32;
        // Reach the furthest corner so the wipe always covers the viewport.
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );

        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
          },
          {
            duration: TRANSITION_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      });
    },
    [beginColourCrossfade],
  );

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) return { theme: 'system', resolved: 'light', setTheme: () => undefined };
  return context;
}

const OPTIONS: Array<{ value: Theme; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/** Three-way segmented toggle. Radios so arrow keys behave as expected. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn('inline-flex items-center rounded-full border border-line bg-tertiary p-0.5', className)}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={(event) => {
            // The wipe originates from the control the user pressed.
            const rect = event.currentTarget.getBoundingClientRect();
            setTheme(value, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }}
          className={cn(
            'inline-flex size-6.5 items-center justify-center rounded-full transition-colors duration-150',
            theme === value ? 'bg-primary text-ink shadow-xs' : 'text-faint hover:text-muted',
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
