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
 * Switching is a slow dissolve, not a wipe: the whole page cross-fades in
 * place, the way a room does when the lights change, rather than a shape
 * sweeping across it.
 *
 * A `theme-switching` class goes on <html> for the duration, which turns on
 * colour transitions across the whole tree, so every token — surfaces,
 * borders, ink, shadows — eases to its new value rather than snapping. The
 * wallpaper cross-fades its day and night plates on its own curve (see
 * Wallpaper and the `.vp-wall-*` rules), which is what carries the feeling.
 *
 * Notably this does *not* use the View Transitions API. That API replaces the
 * page with a pair of static snapshots for the duration, so the wallpaper's
 * own cross-fade never runs — you get the wipe instead of the dissolve. Doing
 * it with plain CSS transitions means every element genuinely eases, including
 * the images.
 *
 * The class is only present while switching, so ordinary hover and focus
 * transitions keep their own, much shorter timings, and the whole thing is
 * skipped under `prefers-reduced-motion`.
 */

export type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'vitpulse-theme';

/**
 * How long the dissolve runs. Long on purpose: the point is to be able to
 * watch the lights come up, not to get it over with.
 */
const TRANSITION_MS = 1500;

/** Injected into <head>; must stay dependency-free and synchronous. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

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
    (next: Theme) => {
      localStorage.setItem(STORAGE_KEY, next);
      setThemeState(next);

      // Arm the transitions before flipping the class, so the very first frame
      // after the change is already interpolating rather than jumping.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) beginColourCrossfade();
      setResolved(applyClass(next));
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
          onClick={() => setTheme(value)}
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
