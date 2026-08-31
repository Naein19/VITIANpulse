import { FeedCardSkeleton, Skeleton } from '@/components/ui/skeleton';

/** Route-level loading shell, shaped like the page it replaces to avoid shift. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[var(--content-max)] px-4 py-8 sm:px-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="mb-8 h-9 w-2/3 max-w-md" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
