'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { humanise } from '@/lib/format';
import { LOCATION_CATEGORIES, type CampusLocation, type LocationCategory } from '@/types/domain';

/**
 * Interactive campus plan.
 *
 * An illustrated SVG plan driven entirely by real `campus_locations` rows —
 * every pin's position comes from the `mapX`/`mapY` columns, so adding a
 * building is a data change, not a code change. `lat`/`lng` columns are already
 * on the model, so swapping the SVG for a tiled map provider later needs no
 * schema migration and no change to this component's props.
 */

const CATEGORY_HUE: Record<LocationCategory, string> = {
  ACADEMIC: 'campus',
  HOSTEL: 'club',
  LIBRARY: 'announcement',
  FOOD: 'opportunity',
  SPORTS: 'sports',
  AUDITORIUM: 'guest',
  ADMIN: 'academic',
  MEDICAL: 'alert',
  SERVICE: 'placement',
  PARKING: 'academic',
};

export function CampusMap({
  locations,
  initialSelected,
}: {
  locations: readonly CampusLocation[];
  initialSelected?: string;
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<LocationCategory | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(
    locations.find((l) => l.slug === initialSelected)?.id ?? null,
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((location) => {
      if (activeCategory !== 'ALL' && location.category !== activeCategory) return false;
      if (!q) return true;
      return (
        location.name.toLowerCase().includes(q) ||
        location.shortName.toLowerCase().includes(q) ||
        location.description.toLowerCase().includes(q)
      );
    });
  }, [locations, query, activeCategory]);

  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const visibleIds = new Set(visible.map((l) => l.id));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ------------------------------------------------------------ plan */}
      <div className="min-w-0">
        <div className="relative overflow-hidden rounded-md border border-line bg-primary">
          <svg
            viewBox="0 0 100 100"
            className="block h-auto w-full"
            role="img"
            aria-label="Illustrated plan of the VIT-AP campus with building markers"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="map-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M5 0H0v5" fill="none" stroke="rgb(var(--border))" strokeWidth="0.15" />
              </pattern>
            </defs>

            <rect width="100" height="100" fill="rgb(var(--bg-secondary))" />
            <rect width="100" height="100" fill="url(#map-grid)" />

            {/* Landscape: green zones and the main circulation spine. */}
            <ellipse cx="50" cy="90" rx="40" ry="12" fill="var(--cat-sports-bg)" opacity="0.55" />
            <ellipse cx="88" cy="72" rx="16" ry="14" fill="var(--cat-campus-bg)" opacity="0.4" />
            <ellipse cx="8" cy="12" rx="14" ry="10" fill="var(--cat-campus-bg)" opacity="0.4" />

            <path
              d="M4 52 H96"
              stroke="rgb(var(--border-strong))"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M44 8 V96"
              stroke="rgb(var(--border-strong))"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M4 52 Q22 30 44 26"
              fill="none"
              stroke="rgb(var(--border-strong))"
              strokeWidth="1.2"
              opacity="0.35"
            />

            <text x="50" y="6" textAnchor="middle" fontSize="2.6" fill="rgb(var(--text-faint))" fontWeight="600">
              NORTH CAMPUS
            </text>
            <text x="50" y="98" textAnchor="middle" fontSize="2.6" fill="rgb(var(--text-faint))" fontWeight="600">
              SPORTS PRECINCT
            </text>

            {locations.map((location) => {
              const dimmed = !visibleIds.has(location.id);
              const active = location.id === selectedId;
              const hue = CATEGORY_HUE[location.category];
              return (
                <g
                  key={location.id}
                  transform={`translate(${location.mapX} ${location.mapY})`}
                  opacity={dimmed ? 0.22 : 1}
                  className="transition-opacity duration-200"
                >
                  <circle
                    r={active ? 3.4 : 2.4}
                    fill={`var(--cat-${hue}-bg)`}
                    stroke={`var(--cat-${hue}-fg)`}
                    strokeWidth={active ? 0.9 : 0.5}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => setSelectedId(active ? null : location.id)}
                  />
                  <text
                    y="0.85"
                    textAnchor="middle"
                    fontSize="1.7"
                    fontWeight="700"
                    fill={`var(--cat-${hue}-fg)`}
                    className="pointer-events-none select-none"
                  >
                    {location.shortName.slice(0, 4)}
                  </text>
                </g>
              );
            })}
          </svg>

          <p className="border-t border-line bg-tertiary px-3 py-2 text-[11.5px] text-faint">
            Illustrative plan — relative positions only, not to scale. Pin coordinates come from the campus locations
            table, so the plan updates whenever a building is added.
          </p>
        </div>

        {/* Every pin is also a real, focusable link for keyboard and screen readers. */}
        <ul className="sr-only">
          {locations.map((location) => (
            <li key={location.id}>
              <button type="button" onClick={() => setSelectedId(location.id)}>
                {location.name} — {humanise(location.category)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* --------------------------------------------------------- side rail */}
      <div className="min-w-0">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a building…"
            aria-label="Find a building on campus"
            className="h-9 w-full rounded-sm border border-line-strong bg-primary pl-8 pr-8 text-[13px] text-ink placeholder:text-faint focus:outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint hover:text-ink"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="vp-scroll-x mb-3 flex gap-1.5 pb-1">
          <CategoryChip active={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')}>
            All
          </CategoryChip>
          {LOCATION_CATEGORIES.map((category) => (
            <CategoryChip
              key={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
            >
              {humanise(category)}
            </CategoryChip>
          ))}
        </div>

        {selected && (
          <div className="mb-3 rounded-md border border-brand/40 bg-brand-soft/40 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{selected.name}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">{humanise(selected.category)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close details"
                className="rounded p-0.5 text-faint hover:text-ink"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-soft">{selected.description}</p>
            <dl className="mt-2.5 space-y-1 text-[12px]">
              {selected.timings && (
                <div className="flex gap-2">
                  <dt className="text-faint">Open</dt>
                  <dd className="text-ink">{selected.timings}</dd>
                </div>
              )}
              {selected.contact && (
                <div className="flex gap-2">
                  <dt className="text-faint">Contact</dt>
                  <dd className="text-ink">{selected.contact}</dd>
                </div>
              )}
            </dl>
            <Link
              href={`/events?q=${encodeURIComponent(selected.name)}`}
              className="mt-2.5 inline-block text-[12px] font-medium text-link hover:underline underline-offset-2"
            >
              Events at this venue
            </Link>
          </div>
        )}

        <div className="rounded-md border border-line bg-primary">
          <p className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
            {visible.length} {visible.length === 1 ? 'place' : 'places'}
          </p>
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted">
              Nothing matches. Try a different name or category.
            </p>
          ) : (
            <ul className="max-h-[52vh] divide-y divide-line overflow-y-auto">
              {visible.map((location) => (
                <li key={location.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(location.id)}
                    aria-pressed={location.id === selectedId}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      location.id === selectedId ? 'bg-brand-soft/50' : 'hover:bg-accent',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-[9.5px] font-bold"
                      style={{
                        backgroundColor: `var(--cat-${CATEGORY_HUE[location.category]}-bg)`,
                        color: `var(--cat-${CATEGORY_HUE[location.category]}-fg)`,
                      }}
                    >
                      {location.shortName.slice(0, 4)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{location.name}</span>
                      <span className="block truncate text-[11.5px] text-faint">
                        {location.timings ?? humanise(location.category)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {LOCATION_CATEGORIES.map((category) => (
            <Badge
              key={category}
              size="xs"
              className="border-transparent"
              tone="neutral"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: `var(--cat-${CATEGORY_HUE[category]}-fg)` }}
              />
              {humanise(category)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
        active
          ? 'border-brand bg-brand-soft text-brand-ink'
          : 'border-line-strong bg-primary text-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
