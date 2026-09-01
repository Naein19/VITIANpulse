import { cn } from '@/lib/cn';

/**
 * Posters.
 *
 * Clubs rarely have artwork ready on day one, and a directory of grey
 * placeholders looks abandoned. So a poster is generated from the entity
 * itself: the slug seeds a small PRNG that picks a motif and lays out the
 * geometry, and the category picks the palette from the same tokens the badges
 * use. The result is deterministic — the same club gets the same poster on
 * every render, on the server and the client — and distinct enough that a
 * regular reader recognises a club by its artwork before reading the name.
 *
 * The moment real artwork exists, `imageUrl` takes over and the generated art
 * is never drawn. This is a fallback with self-respect, not a replacement for
 * a designer.
 */

export type PosterHue =
  | 'campus' | 'club' | 'announcement' | 'opportunity' | 'sports'
  | 'guest' | 'academic' | 'alert' | 'placement' | 'event';

export type PosterRatio = 'portrait' | 'wide' | 'banner' | 'square';

const RATIO_CLASS: Record<PosterRatio, string> = {
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  wide: 'aspect-[16/9]',
  banner: 'aspect-[5/2]',
};

/* ------------------------------------------------------------------ noise */

/** FNV-1a: small, fast, and stable across runtimes — which matters for SSR. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/* ------------------------------------------------------------------ motifs */

const MOTIFS = ['rings', 'lattice', 'ribbons', 'matrix', 'waves', 'burst', 'terraces'] as const;
type Motif = (typeof MOTIFS)[number];

/**
 * Draws the motif into a 100x140 field. Each returns plain SVG children, so the
 * whole poster stays a single inline element with no network cost.
 */
function motifShapes(motif: Motif, next: () => number): React.ReactNode {
  const ink = 'var(--poster-ink)';
  const accent = 'var(--poster-accent)';

  switch (motif) {
    case 'rings': {
      const cx = 18 + next() * 64;
      const cy = 24 + next() * 92;
      return Array.from({ length: 9 }, (_, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={9 + i * 11}
          fill="none"
          stroke={i % 3 === 0 ? accent : ink}
          strokeWidth={i % 3 === 0 ? 1.6 : 0.7}
          opacity={0.85 - i * 0.07}
        />
      ));
    }

    case 'lattice': {
      const step = 8 + Math.round(next() * 5);
      const lines: React.ReactNode[] = [];
      for (let i = -140; i < 200; i += step) {
        lines.push(
          <line key={`a${i}`} x1={i} y1={0} x2={i + 140} y2={140} stroke={ink} strokeWidth="0.6" opacity="0.5" />,
        );
      }
      for (let i = -140; i < 200; i += step * 2) {
        lines.push(
          <line key={`b${i}`} x1={i + 140} y1={0} x2={i} y2={140} stroke={accent} strokeWidth="1.1" opacity="0.75" />,
        );
      }
      return lines;
    }

    case 'ribbons': {
      return Array.from({ length: 5 }, (_, i) => {
        const y = 8 + i * 27 + next() * 8;
        const amp = 14 + next() * 22;
        return (
          <path
            key={i}
            d={`M-10 ${y} C 25 ${y - amp}, 70 ${y + amp}, 110 ${y - amp / 2}`}
            fill="none"
            stroke={i % 2 === 0 ? accent : ink}
            strokeWidth={i % 2 === 0 ? 5 : 2.4}
            strokeLinecap="round"
            opacity={i % 2 === 0 ? 0.75 : 0.5}
          />
        );
      });
    }

    case 'matrix': {
      const dots: React.ReactNode[] = [];
      const cols = 9;
      const rows = 13;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const t = next();
          dots.push(
            <circle
              key={`${r}-${c}`}
              cx={6 + c * 11}
              cy={7 + r * 11}
              r={0.9 + t * 3.4}
              fill={t > 0.82 ? accent : ink}
              opacity={0.25 + t * 0.6}
            />,
          );
        }
      }
      return dots;
    }

    case 'waves': {
      return Array.from({ length: 11 }, (_, i) => {
        const y = 6 + i * 13;
        const amp = 5 + next() * 9;
        return (
          <path
            key={i}
            d={`M-6 ${y} Q 20 ${y - amp}, 44 ${y} T 106 ${y}`}
            fill="none"
            stroke={i % 4 === 0 ? accent : ink}
            strokeWidth={i % 4 === 0 ? 1.8 : 0.8}
            opacity={0.65}
          />
        );
      });
    }

    case 'burst': {
      const cx = 50 + (next() - 0.5) * 40;
      const cy = 70 + (next() - 0.5) * 60;
      return Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2 + next() * 0.08;
        const len = 42 + next() * 78;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * len}
            y2={cy + Math.sin(angle) * len}
            stroke={i % 5 === 0 ? accent : ink}
            strokeWidth={i % 5 === 0 ? 2.2 : 0.8}
            opacity={0.6}
          />
        );
      });
    }

    case 'terraces':
    default: {
      return Array.from({ length: 7 }, (_, i) => {
        const h = 16 + next() * 46;
        const x = i * 15 - 4;
        return (
          <rect
            key={i}
            x={x}
            y={140 - h}
            width="13"
            height={h}
            rx="1.5"
            fill={i % 3 === 0 ? accent : ink}
            opacity={0.2 + (i % 3 === 0 ? 0.42 : 0.24)}
          />
        );
      });
    }
  }
}

/* ------------------------------------------------------------------ poster */

export function Poster({
  seed,
  hue,
  title,
  eyebrow,
  footnote,
  imageUrl,
  imageAlt,
  ratio = 'portrait',
  className,
  compact = false,
}: {
  /** Stable identity — a slug. Same seed, same artwork, always. */
  seed: string;
  hue: PosterHue;
  title: string;
  eyebrow?: string;
  footnote?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  ratio?: PosterRatio;
  className?: string;
  /** Drops the caption block, for use behind other content. */
  compact?: boolean;
}) {
  if (imageUrl) {
    return (
      <div className={cn('relative overflow-hidden rounded-md bg-tertiary', RATIO_CLASS[ratio], className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- posters are remote, user-supplied and already sized */}
        <img
          src={imageUrl}
          alt={imageAlt ?? ''}
          className="size-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const h = hashSeed(seed);
  const next = rng(h);
  const motif = MOTIFS[h % MOTIFS.length] ?? 'rings';
  const rotate = -8 + (h % 17);

  return (
    <div
      className={cn('relative overflow-hidden rounded-md', RATIO_CLASS[ratio], className)}
      style={
        {
          '--poster-bg': `rgb(var(--cat-${hue}-bg))`,
          '--poster-ink': `rgb(var(--cat-${hue}-fg))`,
          '--poster-accent': 'rgb(var(--brand-bg))',
          backgroundColor: 'var(--poster-bg)',
        } as React.CSSProperties
      }
      aria-hidden={compact ? 'true' : undefined}
    >
      <svg
        viewBox="0 0 100 140"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        role={compact ? 'presentation' : 'img'}
        aria-label={compact ? undefined : `Generated artwork for ${title}`}
      >
        <defs>
          {/* A scrim, not a band: the motif fades into the poster's own ground
              so the caption is always legible whatever the artwork does. */}
          <linearGradient id={`poster-floor-${h.toString(36)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--poster-bg)" stopOpacity="0" />
            <stop offset="45%" stopColor="var(--poster-bg)" stopOpacity="0.86" />
            <stop offset="100%" stopColor="var(--poster-bg)" stopOpacity="0.97" />
          </linearGradient>
        </defs>

        <g transform={`rotate(${rotate} 50 70)`}>{motifShapes(motif, next)}</g>
        {!compact && (
          <rect x="0" y="72" width="100" height="68" fill={`url(#poster-floor-${h.toString(36)})`} />
        )}
      </svg>

      {!compact && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          {eyebrow && (
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] opacity-75"
              style={{ color: 'var(--poster-ink)' }}
            >
              {eyebrow}
            </p>
          )}
          <p
            className="vp-clamp-3 text-[15px] font-bold leading-[1.2] tracking-[-0.01em]"
            style={{ color: 'var(--poster-ink)' }}
          >
            {title}
          </p>
          {footnote && (
            <p className="mt-1 truncate text-[11px] font-medium opacity-70" style={{ color: 'var(--poster-ink)' }}>
              {footnote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
