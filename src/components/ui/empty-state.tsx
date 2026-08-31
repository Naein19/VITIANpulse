import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Empty states are a first-class screen, not a fallback string: each one
 * explains what is missing and offers the action that fixes it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-primary text-center',
        compact ? 'gap-2 px-5 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-md border border-line bg-tertiary text-faint">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Error variant — same shape, different tone, always offers a retry. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'This section could not be loaded. Try again in a moment.',
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-md border border-danger/30 bg-danger-soft px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <p className="text-[14px] font-semibold text-danger-ink">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-danger-ink/80">{description}</p>
      {action}
    </div>
  );
}
