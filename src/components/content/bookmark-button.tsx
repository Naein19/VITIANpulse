'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/toast';
import { toggleBookmarkAction } from '@/server/actions/engagement';
import type { BookmarkType } from '@/types/domain';

/**
 * Bookmark toggle.
 *
 * Optimistic: the icon flips immediately, then reconciles with the server. A
 * failure reverts the state and explains why, rather than silently desyncing.
 * Anonymous users are sent to sign-in instead of getting a dead click.
 */
export function BookmarkButton({
  targetType,
  targetId,
  initial,
  signedIn,
  size = 'md',
  withLabel = false,
  className,
}: {
  targetType: BookmarkType;
  targetId: string;
  initial: boolean;
  signedIn: boolean;
  size?: 'sm' | 'md';
  withLabel?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(initial);

  const label = optimistic ? 'Remove bookmark' : 'Bookmark';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={optimistic}
      title={label}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!signedIn) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        startTransition(async () => {
          setOptimistic(!optimistic);
          const result = await toggleBookmarkAction(targetType, targetId);
          if (!result.ok) {
            setOptimistic(optimistic);
            toast(result.error, 'error');
            return;
          }
          toast(result.data.bookmarked ? 'Saved to your list' : 'Removed from saved', 'success');
          router.refresh();
        });
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm transition-colors duration-150',
        withLabel ? 'h-8 border border-line-strong bg-surface px-2.5 text-[12.5px] font-medium hover:border-line-heavy' : 'p-1',
        optimistic ? 'text-brand' : 'text-faint hover:text-ink',
        pending && 'opacity-60',
        className,
      )}
    >
      {optimistic ? (
        <BookmarkCheck className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden="true" />
      ) : (
        <Bookmark className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden="true" />
      )}
      {withLabel && <span>{optimistic ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
