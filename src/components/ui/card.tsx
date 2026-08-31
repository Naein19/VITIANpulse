import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Surfaces.
 *
 * `interactive` adds the lift-on-hover treatment used by feed and grid cards;
 * `flush` removes padding for cards that own their own layout (e.g. a poster).
 */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  flush?: boolean;
  tone?: 'default' | 'sunken' | 'raised';
}

export function Card({ className, interactive, flush, tone = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-md border border-line',
        tone === 'sunken' ? 'bg-sunken' : tone === 'raised' ? 'bg-raised' : 'bg-surface',
        !flush && 'p-4',
        interactive &&
          'transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-md focus-within:border-line-strong',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex items-start justify-between gap-3', className)} {...props} />;
}

export function CardTitle({ className, as: As = 'h3', ...props }: HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }) {
  return <As className={cn('text-[15px] font-semibold leading-snug text-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[13px] leading-relaxed text-muted', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[12px] text-muted', className)}
      {...props}
    />
  );
}

/**
 * A section shell with the product's standard header treatment: an eyebrow
 * label, a heading, and an optional action on the right.
 */
export function Section({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('scroll-mt-20', className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{eyebrow}</p>
          )}
          <h2 className="text-[19px] leading-tight text-ink sm:text-[21px]">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-[13px] text-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** The dotted rule used to separate dense list rows. */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />;
}
