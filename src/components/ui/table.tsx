import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';

/**
 * Dense data table.
 *
 * Wrapped in a horizontal scroll container so a wide table never forces the page
 * body to scroll sideways. On narrow screens, callers render `DataList` instead.
 */

export function Table({ children, className, caption }: { children: ReactNode; className?: string; caption?: string }) {
  return (
    <div className="vp-scroll-x rounded-md border border-line bg-primary">
      <table className={cn('w-full border-collapse text-[13px]', className)}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-1 whitespace-nowrap border-b border-line bg-tertiary px-3 py-2 text-left',
        'text-[11px] font-semibold uppercase tracking-[0.07em] text-faint',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-line px-3 py-2.5 align-middle text-soft', className)} {...props} />;
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors duration-100 hover:bg-accent', className)} {...props} />;
}

/** Row index cell, matching the numbered-table treatment used across admin. */
export function RowNumber({ index }: { index: number }) {
  return <Td className="vp-numeric w-10 text-right text-[11px] text-faint">{index + 1}</Td>;
}

/**
 * The mobile counterpart to a table: the same records as stacked rows.
 * Callers render `<Table>` inside `hidden md:block` and this inside `md:hidden`.
 */
export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('divide-y divide-line rounded-md border border-line bg-primary', className)}>{children}</ul>;
}

export function DataListRow({
  title,
  subtitle,
  meta,
  action,
  href,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  href?: string;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-[12px] text-muted">{subtitle}</p>}
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </>
  );

  return (
    <li>
      {href ? (
        <Link href={href} className="flex items-start gap-3 p-3 transition-colors hover:bg-accent">
          {content}
        </Link>
      ) : (
        <div className="flex items-start gap-3 p-3">{content}</div>
      )}
    </li>
  );
}
