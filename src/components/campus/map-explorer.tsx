'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Layers, MapPin, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { humanise } from '@/lib/format';
import { CampusMap3D } from './campus-map-3d';
import { CampusPlan } from './campus-plan';
import { UNIVERSITY } from '@/data/vitap';
import { LOCATION_CATEGORIES, type CampusLocation, type LocationCategory } from '@/types/domain';

/**
 * Campus map explorer.
 *
 * Owns the shared state — search, category, selection — and hands it to
 * whichever view is showing. Both views are driven by the same
 * `campus_locations` rows, so a place added to the data appears on the real
 * map, on the schematic and in the directory at once.
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

type View = 'map' | 'plan';

export function MapExplorer({
  locations,
  initialSelected,
}: {
  locations: readonly CampusLocation[];
  initialSelected?: string;
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<LocationCategory | 'ALL'>('ALL');
  const [view, setView] = useState<View>('map');
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
        location.description.toLowerCase().includes(q) ||
        location.tags.some((tag) => tag.includes(q))
      );
    });
  }, [locations, query, activeCategory]);

  const visibleIds = useMemo(() => new Set(visible.map((l) => l.id)), [visible]);
  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const unplaced = visible.filter((l) => l.lat === null);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      {/* ------------------------------------------------------------- view */}
      <div className="min-w-0">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-sm border border-line-strong bg-primary p-0.5" role="group" aria-label="Map view">
            <ViewTab active={view === 'map'} onClick={() => setView('map')}>
              <MapPin className="size-3.5" aria-hidden="true" />
              3D map
            </ViewTab>
            <ViewTab active={view === 'plan'} onClick={() => setView('plan')}>
              <Layers className="size-3.5" aria-hidden="true" />
              Plan
            </ViewTab>
          </div>

          <a
            href={UNIVERSITY.mapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-link hover:underline underline-offset-2"
          >
            Directions
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>

        {view === 'map' ? (
          <CampusMap3D
            locations={locations}
            visibleIds={visibleIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <CampusPlan
            locations={locations}
            visibleIds={visibleIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </div>

      {/* ------------------------------------------------------------ rail */}
      <div className="min-w-0">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a place…"
            aria-label="Find a place on campus"
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
                <p className="text-[14px] font-semibold leading-snug text-ink">{selected.name}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {humanise(selected.category)}
                  {selected.levels !== null && ` · ${selected.levels} floors`}
                </p>
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
              <div className="flex gap-2">
                <dt className="text-faint">Position</dt>
                <dd className="font-mono text-ink">
                  {selected.lat !== null && selected.lng !== null
                    ? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`
                    : 'not published'}
                </dd>
              </div>
            </dl>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href={`/events?q=${encodeURIComponent(selected.shortName)}`}
                className="text-[12px] font-medium text-link hover:underline underline-offset-2"
              >
                Events here
              </Link>
              {selected.lat !== null && selected.lng !== null && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lng}#map=18/${selected.lat}/${selected.lng}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-link hover:underline underline-offset-2"
                >
                  Open in OSM
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="rounded-md border border-line bg-primary">
          <p className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
            {visible.length} {visible.length === 1 ? 'place' : 'places'}
            {unplaced.length > 0 && ` · ${unplaced.length} unmapped`}
          </p>
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted">
              Nothing matches. Try a different name or category.
            </p>
          ) : (
            <ul className="max-h-[46vh] divide-y divide-line overflow-y-auto">
              {visible.map((location) => (
                <li key={location.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(location.id === selectedId ? null : location.id)}
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
                        backgroundColor: `rgb(var(--cat-${CATEGORY_HUE[location.category]}-bg))`,
                        color: `rgb(var(--cat-${CATEGORY_HUE[location.category]}-fg))`,
                      }}
                    >
                      {location.shortName.slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{location.name}</span>
                      <span className="block truncate text-[11.5px] text-faint">
                        {location.lat === null ? 'Location not published' : location.timings ?? humanise(location.category)}
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
            <Badge key={category} size="xs" className="border-transparent" tone="neutral">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: `rgb(var(--cat-${CATEGORY_HUE[category]}-fg))` }}
              />
              {humanise(category)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewTab({
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
        'inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[12px] font-medium transition-colors',
        active ? 'bg-brand text-brand-fg' : 'text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
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
