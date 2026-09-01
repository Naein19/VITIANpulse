import { SKYLINE, SKYLINE_VIEWBOX } from '@/data/campus-skyline';

/**
 * The animated campus scene.
 *
 * Not an illustration of a campus — this campus. The shapes are the real
 * OpenStreetMap footprints of the Central Block and the two academic blocks,
 * extruded to their real storey counts and drawn in isometric. The Central
 * Block's curved plan and eleven storeys are what make the silhouette
 * recognisable to anyone who has walked past it.
 *
 * Everything moves in CSS — no animation library, nothing to hydrate — and the
 * global prefers-reduced-motion rule stops all of it for anyone who asks.
 */

const { width, height } = SKYLINE_VIEWBOX;

export function CampusScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="Isometric view of the VIT-AP campus core — the Central Block with AB-1 and AB-2 — drawn from the real building outlines"
    >
      <defs>
        <linearGradient id="scene-roof" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="rgb(var(--text-primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(var(--text-primary))" stopOpacity="0.09" />
        </linearGradient>
        <linearGradient id="scene-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--brand-bg))" stopOpacity="0" />
          <stop offset="50%" stopColor="rgb(var(--brand-bg))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(var(--brand-bg))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Distant points of light — the rest of campus, out of frame. */}
      {Array.from({ length: 22 }, (_, i) => (
        <circle
          key={`star-${i}`}
          cx={((i * 149) % (width - 40)) + 20}
          cy={16 + ((i * 53) % 120)}
          r={i % 6 === 0 ? 1.9 : 1.1}
          fill="rgb(var(--text-primary))"
          className="vp-scene-window"
          style={{ animationDelay: `${(i % 9) * 430}ms` }}
        />
      ))}

      {SKYLINE.map((building, b) => (
        <g
          key={building.name}
          className="vp-scene-tower"
          style={{ animationDelay: `${140 + b * 150}ms` }}
        >
          {building.walls.map((wall, w) => (
            <g key={`${building.name}-w${w}`}>
              <path
                d={wall.d}
                fill="rgb(var(--text-primary))"
                fillOpacity={0.05 + wall.shade * 0.09}
                stroke="rgb(var(--border-strong))"
                strokeWidth="0.7"
                strokeOpacity="0.55"
              />
              {wall.windows.map((win, k) => (
                <path
                  key={`${building.name}-w${w}-${k}`}
                  d={win.d}
                  fill="rgb(var(--brand-bg))"
                  className="vp-scene-window"
                  style={{ animationDelay: `${win.i * 340 + b * 200}ms` }}
                />
              ))}
            </g>
          ))}

          <path
            d={building.roof}
            fill="url(#scene-roof)"
            stroke="rgb(var(--border-strong))"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* A pulse crossing the campus every few seconds. */}
      <g className="vp-scene-sweep">
        <rect x={-width * 0.16} y="0" width={width * 0.2} height={height} fill="url(#scene-sweep)" />
      </g>
    </svg>
  );
}
