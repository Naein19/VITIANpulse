import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Breadcrumbs } from '@/components/ui/misc';

/**
 * The standard page masthead: breadcrumb, eyebrow, title, description and an
 * optional action cluster, sitting on the subtle grid ground used across the
 * product's section headers.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  breadcrumbs,
  children,
  className,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  breadcrumbs?: ReadonlyArray<{ label: string; href?: string }>;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('relative overflow-hidden border-b border-line bg-canvas-alt', className)}>
      <div className="vp-grid-bg vp-fade-b pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className={cn(
          'relative mx-auto max-w-[var(--vp-shell-max)] px-4 sm:px-6',
          compact ? 'py-5 sm:py-6' : 'py-7 sm:py-9',
        )}
      >
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{eyebrow}</p>
            )}
            <h1 className={cn('text-ink', compact ? 'text-[24px] sm:text-[27px]' : 'text-[28px] sm:text-[34px]')}>
              {title}
            </h1>
            {description && (
              <div className="mt-2 text-[14px] leading-relaxed text-muted">{description}</div>
            )}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}

/** Standard content container for page bodies. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-[var(--vp-shell-max)] px-4 py-7 sm:px-6 sm:py-9', className)}>{children}</div>
  );
}
