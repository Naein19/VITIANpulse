'use client';

import { cn } from '@/lib/cn';
import type { CampusLocation, LocationCategory } from '@/types/domain';

/**
 * Schematic plan — the offline fallback for the real map.
 *
 * Every position here is the OpenStreetMap coordinate projected into a 0-100
 * square (see `CAMPUS_VIEW` in src/data/vitap.ts), so this is a scaled drawing
 * of the campus rather than an artist's impression. Nothing is added that is
 * not in the data: no invented roads, lawns or building outlines. If it is not
 * a place we have a real coordinate for, it is not on this plan.
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

/** The projection window is 0.006034° of latitude across, i.e. ~672 m. */
const METRES_ACROSS = 672;
const SCALE_BAR_METRES = 100;

export function CampusPlan({
  locations,
  visibleIds,
  selectedId,
  onSelect,
  className,
}: {
  locations: readonly CampusLocation[];
  visibleIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}) {
  const placed = locations.filter(
    (l): l is CampusLocation & { mapX: number; mapY: number } => l.mapX !== null && l.mapY !== null,
  );
  const barWidth = (SCALE_BAR_METRES / METRES_ACROSS) * 100;

  return (
    <div className={cn('overflow-hidden rounded-md border border-line bg-tertiary', className)}>
      <svg
        viewBox="0 0 100 100"
        className="block h-auto w-full"
        role="img"
        aria-label="Scaled plan of the VIT-AP campus with a marker for each mapped place"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="plan-grid" width="7.44" height="7.44" patternUnits="userSpaceOnUse">
            {/* One cell is 50 m at this projection. */}
            <path d="M7.44 0H0v7.44" fill="none" stroke="rgb(var(--border))" strokeWidth="0.12" />
          </pattern>
        </defs>

        <rect width="100" height="100" fill="rgb(var(--bg-secondary))" />
        <rect width="100" height="100" fill="url(#plan-grid)" />

        {placed.map((location) => {
          const dimmed = !visibleIds.has(location.id);
          const active = location.id === selectedId;
          const hue = CATEGORY_HUE[location.category];
          return (
            <g
              key={location.id}
              transform={`translate(${location.mapX} ${location.mapY})`}
              opacity={dimmed ? 0.2 : 1}
              className="transition-opacity duration-200"
            >
              <circle
                r={active ? 2.6 : 1.7}
                fill={`rgb(var(--cat-${hue}-bg))`}
                stroke={`rgb(var(--cat-${hue}-fg))`}
                strokeWidth={active ? 0.7 : 0.4}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelect(active ? null : location.id)}
              />
              <text
                y={-2.8}
                textAnchor="middle"
                fontSize="2"
                fontWeight="700"
                fill={`rgb(var(--cat-${hue}-fg))`}
                className="pointer-events-none select-none"
              >
                {location.shortName}
              </text>
            </g>
          );
        })}

        {/* North arrow. */}
        <g transform="translate(93 8)" opacity="0.75">
          <path d="M0 -3.4 L1.7 1.7 L0 0.5 L-1.7 1.7 Z" fill="rgb(var(--text-faint))" />
          <text y="4.8" textAnchor="middle" fontSize="2.4" fontWeight="700" fill="rgb(var(--text-faint))">N</text>
        </g>

        {/* Scale bar, derived from the projection rather than eyeballed. */}
        <g transform="translate(5 95)">
          <line x1="0" y1="0" x2={barWidth} y2="0" stroke="rgb(var(--text-faint))" strokeWidth="0.5" />
          <line x1="0" y1="-1" x2="0" y2="1" stroke="rgb(var(--text-faint))" strokeWidth="0.5" />
          <line x1={barWidth} y1="-1" x2={barWidth} y2="1" stroke="rgb(var(--text-faint))" strokeWidth="0.5" />
          <text x={barWidth / 2} y="-1.8" textAnchor="middle" fontSize="2.2" fill="rgb(var(--text-faint))">
            {SCALE_BAR_METRES} m
          </text>
        </g>
      </svg>

      <p className="border-t border-line bg-primary px-3 py-2 text-[11.5px] leading-relaxed text-faint">
        Offline plan. Positions are real OpenStreetMap coordinates projected to scale — {placed.length} places, north up.
      </p>
    </div>
  );
}
