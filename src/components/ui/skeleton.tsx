import { cn } from '@/lib/cn';

/** Shimmer placeholder. Always sized to the content it replaces to avoid CLS. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('vp-skeleton rounded-sm', className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="rounded-md border border-line bg-primary p-4" aria-hidden="true">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="mb-2 h-5 w-4/5" />
      <SkeletonText lines={2} />
      <div className="mt-3 flex gap-2 border-t border-line pt-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-primary" aria-hidden="true">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ListRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line rounded-md border border-line bg-primary" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-8 rounded-sm" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
