'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowBigUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/toast';
import { formatCount } from '@/lib/format';
import { toggleUpvoteAction } from '@/server/actions/community';

/**
 * Upvote toggle.
 *
 * Backed by a unique (user, target) vote row, so it is idempotent — a double
 * click cannot inflate the count, and the denormalised counter is adjusted by
 * exactly one in each direction.
 */
export function UpvoteButton({
  targetType,
  targetId,
  initialCount,
  initialVoted,
  signedIn,
  size = 'sm',
}: {
  targetType: 'DISCUSSION' | 'COMMENT';
  targetId: string;
  initialCount: number;
  initialVoted: boolean;
  signedIn: boolean;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useOptimistic({ count: initialCount, voted: initialVoted });

  return (
    <button
      type="button"
      aria-pressed={state.voted}
      aria-label={state.voted ? 'Remove upvote' : 'Upvote'}
      disabled={pending}
      onClick={() => {
        if (!signedIn) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        startTransition(async () => {
          setState({ count: state.count + (state.voted ? -1 : 1), voted: !state.voted });
          const result = await toggleUpvoteAction(targetType, targetId);
          if (!result.ok) {
            setState({ count: initialCount, voted: initialVoted });
            toast(result.error, 'error');
            return;
          }
          router.refresh();
        });
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border transition-colors',
        size === 'sm' ? 'h-7 px-2 text-[12px]' : 'h-8 px-2.5 text-[13px]',
        state.voted
          ? 'border-green/50 bg-success-soft font-semibold text-success-ink'
          : 'border-line bg-primary text-muted hover:border-line-strong hover:text-ink',
        pending && 'opacity-60',
      )}
    >
      <ArrowBigUp className={cn('size-3.5', state.voted && 'fill-current')} aria-hidden="true" />
      <span className="vp-numeric">{formatCount(state.count)}</span>
    </button>
  );
}
