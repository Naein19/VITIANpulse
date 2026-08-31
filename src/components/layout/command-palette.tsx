'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Bookmark, Bell, CalendarDays, FileText, LayoutDashboard, Loader2, Moon, Search,
  Sparkles, Users, LibraryBig, Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Kbd } from '@/components/ui/misc';
import { useTheme } from './theme';
import type { SearchEntity, SearchHit } from '@/types/domain';

/**
 * Command palette (⌘K / Ctrl+K).
 *
 * Two modes in one surface: with no query it lists commands and recent
 * searches; with a query it debounces a search against `/api/search` and groups
 * the hits. Fully keyboard driven — arrows move, Enter runs, Escape closes.
 */

const RECENT_KEY = 'vitpulse-recent-searches';
const MAX_RECENT = 6;

interface PaletteContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function useCommandPalette(): PaletteContextValue {
  return useContext(PaletteContext) ?? { open: () => undefined, close: () => undefined, isOpen: false };
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
  group: string;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <PaletteContext.Provider value={value}>
      {children}
      {isOpen && <CommandPalette onClose={close} />}
    </PaletteContext.Provider>
  );
}

const ENTITY_META: Record<SearchEntity, { label: string; icon: typeof Search }> = {
  event: { label: 'Events', icon: CalendarDays },
  club: { label: 'Clubs', icon: Users },
  pyq: { label: 'PYQs', icon: FileText },
  post: { label: 'News', icon: Newspaper },
  opportunity: { label: 'Opportunities', icon: Sparkles },
  resource: { label: 'Resources', icon: LibraryBig },
};

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { setTheme, resolved } = useTheme();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
      if (Array.isArray(stored)) setRecent(stored.filter((s): s is string => typeof s === 'string').slice(0, MAX_RECENT));
    } catch {
      setRecent([]);
    }
    inputRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // Debounce so a fast typist issues one request, not one per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 180);
    return () => window.clearTimeout(id);
  }, [query]);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ['palette-search', debounced],
    enabled: debounced.length >= 2,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debounced)}&limit=5`, { signal });
      if (!response.ok) throw new Error('Search failed');
      const payload = (await response.json()) as { hits: SearchHit[] };
      return payload.hits;
    },
  });

  const rememberSearch = useCallback((value: string) => {
    if (value.trim().length < 2) return;
    setRecent((current) => {
      const next = [value.trim(), ...current.filter((r) => r !== value.trim())].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable in private mode; recents are a nicety.
      }
      return next;
    });
  }, []);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const commands = useMemo<Command[]>(
    () => [
      { id: 'events', label: 'Browse events', icon: CalendarDays, group: 'Go to', run: () => go('/events') },
      { id: 'clubs', label: 'Browse clubs', icon: Users, group: 'Go to', run: () => go('/clubs') },
      { id: 'pyqs', label: 'Open PYQ Hub', icon: FileText, group: 'Go to', run: () => go('/pyqs') },
      { id: 'news', label: 'Read campus news', icon: Newspaper, group: 'Go to', run: () => go('/news') },
      { id: 'opps', label: 'Find opportunities', icon: Sparkles, group: 'Go to', run: () => go('/opportunities') },
      { id: 'resources', label: 'Open resources', icon: LibraryBig, group: 'Go to', run: () => go('/resources') },
      { id: 'dashboard', label: 'Open my dashboard', icon: LayoutDashboard, group: 'Your space', run: () => go('/dashboard') },
      { id: 'saved', label: 'Open saved items', icon: Bookmark, group: 'Your space', run: () => go('/saved') },
      { id: 'notifications', label: 'Open notifications', icon: Bell, group: 'Your space', run: () => go('/notifications') },
      {
        id: 'theme',
        label: `Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`,
        icon: Moon,
        group: 'Preferences',
        hint: 'Toggle',
        run: () => {
          setTheme(resolved === 'dark' ? 'light' : 'dark');
          onClose();
        },
      },
    ],
    [go, onClose, resolved, setTheme],
  );

  const searching = debounced.length >= 2;
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.trim().toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  // One flat list of selectable rows so arrow navigation crosses group borders.
  const rows = useMemo(() => {
    const out: Array<{ key: string; run: () => void }> = [];
    if (searching) {
      for (const hit of hits) out.push({ key: `hit-${hit.id}`, run: () => { rememberSearch(debounced); go(hit.href); } });
      out.push({ key: 'see-all', run: () => { rememberSearch(debounced); go(`/search?q=${encodeURIComponent(debounced)}`); } });
    }
    for (const command of filteredCommands) out.push({ key: command.id, run: command.run });
    if (!searching) {
      for (const term of recent) out.push({ key: `recent-${term}`, run: () => go(`/search?q=${encodeURIComponent(term)}`) });
    }
    return out;
  }, [searching, hits, filteredCommands, recent, debounced, go, rememberSearch]);

  useEffect(() => setActiveIndex(0), [debounced, query]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      rows[activeIndex]?.run();
    }
  };

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const grouped = useMemo(() => {
    const out = new Map<string, Command[]>();
    for (const command of filteredCommands) {
      const list = out.get(command.group) ?? [];
      list.push(command);
      out.set(command.group, list);
    }
    return out;
  }, [filteredCommands]);

  let cursor = 0;

  return (
    <div className="fixed inset-0 z-200 flex items-start justify-center p-3 pt-[8vh] sm:pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        tabIndex={-1}
        className="vp-anim-fade-in absolute inset-0 bg-[var(--vp-overlay)] backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        onKeyDown={onKeyDown}
        className="vp-anim-scale-in relative z-10 flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line-strong bg-raised shadow-lg"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          {isFetching ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-faint" aria-hidden="true" />
          ) : (
            <Search className="size-4 shrink-0 text-faint" aria-hidden="true" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, clubs, PYQs, news…"
            aria-label="Search VITPulse"
            className="h-13 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            autoComplete="off"
            spellCheck={false}
          />
          <Kbd className="hidden sm:inline-flex">Esc</Kbd>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-2" role="listbox" aria-label="Results">
          {searching && (
            <>
              {hits.length === 0 && !isFetching && (
                <p className="px-4 py-8 text-center text-[13px] text-muted">
                  No matches for “{debounced}”. Try a course code, a club name or an event.
                </p>
              )}
              {Object.entries(groupHitsByEntity(hits)).map(([entity, entityHits]) => {
                if (entityHits.length === 0) return null;
                const meta = ENTITY_META[entity as SearchEntity];
                return (
                  <div key={entity} className="mb-1">
                    <GroupLabel>{meta.label}</GroupLabel>
                    {entityHits.map((hit) => {
                      const index = cursor;
                      cursor += 1;
                      return (
                        <Row
                          key={hit.id}
                          active={index === activeIndex}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => {
                            rememberSearch(debounced);
                            go(hit.href);
                          }}
                          icon={<meta.icon className="size-3.5" aria-hidden="true" />}
                          title={hit.title}
                          subtitle={hit.subtitle}
                          badge={hit.badge}
                        />
                      );
                    })}
                  </div>
                );
              })}
              {(() => {
                const index = cursor;
                cursor += 1;
                return (
                  <Row
                    active={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      rememberSearch(debounced);
                      go(`/search?q=${encodeURIComponent(debounced)}`);
                    }}
                    icon={<ArrowRight className="size-3.5" aria-hidden="true" />}
                    title={`See all results for “${debounced}”`}
                  />
                );
              })()}
            </>
          )}

          {[...grouped.entries()].map(([group, items]) => (
            <div key={group} className="mb-1">
              <GroupLabel>{group}</GroupLabel>
              {items.map((command) => {
                const index = cursor;
                cursor += 1;
                return (
                  <Row
                    key={command.id}
                    active={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={command.run}
                    icon={<command.icon className="size-3.5" aria-hidden="true" />}
                    title={command.label}
                    badge={command.hint ?? null}
                  />
                );
              })}
            </div>
          ))}

          {!searching && recent.length > 0 && (
            <div className="mb-1">
              <GroupLabel>Recent searches</GroupLabel>
              {recent.map((term) => {
                const index = cursor;
                cursor += 1;
                return (
                  <Row
                    key={term}
                    active={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(`/search?q=${encodeURIComponent(term)}`)}
                    icon={<Search className="size-3.5" aria-hidden="true" />}
                    title={term}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line bg-surface px-4 py-2 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> open
          </span>
          <Link href="/search" onClick={onClose} className="ml-auto hover:text-muted hover:underline underline-offset-2">
            Advanced search
          </Link>
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">{children}</p>
  );
}

function Row({
  active, onClick, onMouseEnter, icon, title, subtitle, badge,
}: {
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badge?: string | null;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-active={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-75',
        active ? 'bg-canvas-alt' : 'hover:bg-canvas-alt/60',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-brand' : 'text-faint')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-ink">{title}</span>
        {subtitle && <span className="block truncate text-[12px] text-muted">{subtitle}</span>}
      </span>
      {badge && (
        <span className="shrink-0 rounded-[var(--radius-xs)] bg-sunken px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
          {badge.replace(/_/g, ' ')}
        </span>
      )}
    </button>
  );
}

function groupHitsByEntity(hits: readonly SearchHit[]): Record<SearchEntity, SearchHit[]> {
  const out: Record<SearchEntity, SearchHit[]> = {
    event: [], club: [], pyq: [], post: [], opportunity: [], resource: [],
  };
  for (const hit of hits) out[hit.entity].push(hit);
  return out;
}
