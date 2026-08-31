import { formatCount } from '@/lib/format';
import type { DailyPoint } from '@/server/db/repositories/analytics';

/**
 * Daily traffic.
 *
 * A hand-rolled SVG column chart rather than a charting dependency: the shape is
 * fixed, the data is tiny, and it renders on the server with no client JS. Views
 * are columns; unique visitors are an overlaid line.
 */
export function TrafficChart({ points }: { points: readonly DailyPoint[] }) {
  if (points.length === 0) return null;

  const max = Math.max(1, ...points.map((p) => p.views));
  const width = 720;
  const height = 180;
  const padX = 8;
  const padY = 12;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const step = usableW / points.length;
  const barW = Math.max(2, step * 0.62);

  const linePoints = points
    .map((point, i) => {
      const x = padX + i * step + step / 2;
      const y = padY + usableH - (point.visitors / max) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const totalViews = points.reduce((sum, p) => sum + p.views, 0);
  const peak = points.reduce((best, p) => (p.views > best.views ? p : best), points[0]!);

  return (
    <figure className="rounded-md border border-line bg-primary p-4">
      <figcaption className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="t-sm-strong text-ink">{formatCount(totalViews)} page views</span>
        <span className="text-[12px] text-faint">
          Peak {formatCount(peak.views)} on {peak.date}
        </span>
        <span className="ml-auto flex items-center gap-3 text-[11.5px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-brand" aria-hidden="true" />
            Views
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-blue" aria-hidden="true" />
            Unique
          </span>
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Daily page views over ${points.length} days, peaking at ${peak.views} on ${peak.date}`}
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padY + usableH - usableH * fraction}
            y2={padY + usableH - usableH * fraction}
            stroke="rgb(var(--border))"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        ))}

        {points.map((point, i) => {
          const h = (point.views / max) * usableH;
          return (
            <rect
              key={point.date}
              x={padX + i * step + (step - barW) / 2}
              y={padY + usableH - h}
              width={barW}
              height={Math.max(h, point.views > 0 ? 2 : 0)}
              rx="1.5"
              fill="rgb(var(--brand-bg))"
              opacity="0.85"
            >
              <title>{`${point.date}: ${point.views} views, ${point.visitors} unique`}</title>
            </rect>
          );
        })}

        <polyline
          points={linePoints}
          fill="none"
          stroke="rgb(var(--hue-blue))"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-2 flex justify-between text-[10.5px] text-faint">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </figure>
  );
}
