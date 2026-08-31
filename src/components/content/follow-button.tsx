'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { toggleClubFollowAction } from '@/server/actions/engagement';
import type { ButtonSize } from '@/components/ui/button';

/**
 * Club follow toggle.
 *
 * A follow is a real mutation with real consequences: it updates the club's
 * follower count, adds the club's posts and events to the follower's ranked
 * feed, and opts them into that club's update notifications.
 */
export function FollowButton({
  clubId,
  initial,
  signedIn,
  size = 'sm',
  className,
}: {
  clubId: string;
  initial: boolean;
  signedIn: boolean;
  size?: ButtonSize;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [following, setFollowing] = useOptimistic(initial);

  return (
    <Button
      size={size}
      variant={following ? 'secondary' : 'primary'}
      loading={pending}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!signedIn) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        startTransition(async () => {
          setFollowing(!following);
          const result = await toggleClubFollowAction(clubId);
          if (!result.ok) {
            setFollowing(following);
            toast(result.error, 'error');
            return;
          }
          toast(result.data.following ? 'Following — their events now appear in your feed' : 'Unfollowed', 'success');
          router.refresh();
        });
      }}
    >
      {following ? (
        <>
          <Check className="size-3.5" aria-hidden="true" />
          Following
        </>
      ) : (
        <>
          <Plus className="size-3.5" aria-hidden="true" />
          Follow
        </>
      )}
    </Button>
  );
}
