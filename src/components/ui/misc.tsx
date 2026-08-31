'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

/** Avatar. Falls back to initials on a deterministic hue derived from the name. */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = { xs: 'size-5 text-[9px]', sm: 'size-7 text-[10px]', md: 'size-9 text-[12px]', lg: 'size-14 text-[18px]' };
  // Stable hue per name so the same person keeps the same colour everywhere.
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars are small, already-sized remote images
    return <img src={src} alt="" className={cn('rounded-full border border-line object-cover', sizes[size], className)} loading="lazy" />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full border font-semibold', sizes[size], className)}
      style={{
        backgroundColor: `oklch(0.92 0.05 ${hash})`,
        color: `oklch(0.36 0.09 ${hash})`,
        borderColor: `oklch(0.84 0.06 ${hash})`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/** Small labelled statistic used across dashboards and detail pages. */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'brand' | 'success' | 'danger';
  className?: string;
}) {
  const tones = {
    default: 'text-ink',
    brand: 'text-brand-ink',
    success: 'text-success-ink',
    danger: 'text-danger-ink',
  };
  return (
    <div className={cn('rounded-md border border-line bg-primary p-3.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{label}</p>
      <p className={cn('vp-numeric mt-1.5 text-[22px] font-bold leading-none tracking-tight', tones[tone])}>{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

/** A key/value row for dense detail panels. */
export function MetaRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2', className)}>
      <dt className="shrink-0 text-[12px] font-medium text-faint">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/** Inline alert. Tone maps to meaning; never used purely for emphasis. */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  title?: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const tones = {
    info: 'border-info/30 bg-info-soft text-info-ink',
    warning: 'border-warning/30 bg-warning-soft text-warning-ink',
    danger: 'border-danger/30 bg-danger-soft text-danger-ink',
    success: 'border-success/30 bg-success-soft text-success-ink',
    neutral: 'border-line bg-tertiary text-soft',
  };
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex flex-wrap items-start gap-3 rounded-md border px-3.5 py-3 text-[13px] leading-relaxed', tones[tone], className)}
    >
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

/** Renders plain-text bodies as paragraphs. No HTML is ever interpreted. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return (
    <div className={cn('space-y-4 text-[14.5px] leading-[1.75] text-soft', className)}>
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

/** Progress meter with an accessible role and text alternative. */
export function Meter({
  value,
  max,
  label,
  tone = 'brand',
  className,
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tones = {
    brand: 'bg-brand',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-tertiary', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Breadcrumb trail. The last item is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: ReadonlyArray<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="transition-colors hover:text-ink hover:underline underline-offset-2">
                {item.label}
              </Link>
            ) : (
              <span className={i === items.length - 1 ? 'font-medium text-soft' : undefined} aria-current={i === items.length - 1 ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {i < items.length - 1 && <span className="text-faint" aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * A live clock. Renders the server-provided value first, then upgrades after
 * mount, so there is no hydration mismatch and no layout shift.
 */
export function LiveClock({ initial, className }: { initial: string; className?: string }) {
  const [time, setTime] = useState(initial);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time className={cn('vp-numeric tabular-nums', className)} suppressHydrationWarning>
      {time}
    </time>
  );
}

/** The animated "live" dot used on today's activity. */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2 shrink-0', className)} aria-hidden="true">
      <span className="vp-anim-pulse-ring absolute inset-0 rounded-full bg-green" />
      <span className="relative inline-flex size-2 rounded-full bg-green" />
    </span>
  );
}

/** Keyboard shortcut hint. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-line-strong bg-tertiary px-1.5',
        'font-mono text-[10.5px] font-medium text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
