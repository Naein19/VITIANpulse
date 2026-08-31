import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';

/**
 * Link-based pagination.
 *
 * Uses real anchors so pages are crawlable, shareable and work without
 * JavaScript. Page windows are elided with ellipses beyond seven pages.
 */
export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
  className,
  itemLabel = 'results',
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
  className?: string;
  itemLabel?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) {
    return total > 0 ? (
      <p className={cn('text-[12px] text-faint', className)}>
        {formatCount(total)} {itemLabel}
      </p>
    ) : null;
  }

  const pages = pageWindow(page, pageCount);
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav className={cn('flex flex-wrap items-center justify-between gap-3', className)} aria-label="Pagination">
      <p className="vp-numeric text-[12px] text-faint">
        {first}–{last} of {formatCount(total)} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Previous page">
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </PageLink>
        {pages.map((entry, i) =>
          entry === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-[12px] text-faint" aria-hidden="true">
              …
            </span>
          ) : (
            <PageLink key={entry} href={buildHref(entry)} active={entry === page} label={`Page ${entry}`}>
              {entry}
            </PageLink>
          ),
        )}
        <PageLink href={buildHref(page + 1)} disabled={page >= pageCount} label="Next page">
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href, children, active, disabled, label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const classes = cn(
    'vp-numeric inline-flex h-8 min-w-8 items-center justify-center rounded-sm border px-2 text-[12.5px] font-medium transition-colors',
    active
      ? 'border-brand bg-brand-soft text-brand-ink'
      : 'border-line-strong bg-primary text-muted hover:border-line-strong hover:text-ink',
    disabled && 'pointer-events-none opacity-40',
  );

  if (disabled) {
    return (
      <span className={classes} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={classes} aria-label={label} aria-current={active ? 'page' : undefined} scroll>
      {children}
    </Link>
  );
}

/** Produces e.g. [1, 'gap', 4, 5, 6, 'gap', 20]. */
export function pageWindow(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: Array<number | 'gap'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push('gap');
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < pageCount - 1) out.push('gap');
  out.push(pageCount);
  return out;
}
