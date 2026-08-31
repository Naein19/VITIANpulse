'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { setClubStatusAction, setClubVerifiedAction } from '@/server/actions/clubs';
import type { ContentStatus } from '@/types/domain';

/** Approve, reject and verify controls for a club. */
export function ClubAdminActions({
  id,
  status,
  verified,
  canVerify,
}: {
  id: string;
  status: ContentStatus;
  verified: boolean;
  canVerify: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const setStatus = (next: ContentStatus) =>
    startTransition(async () => {
      const result = await setClubStatusAction(id, next);
      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }
      toast(next === 'PUBLISHED' ? 'Club published' : `Marked ${next.toLowerCase()}`, 'success');
      router.refresh();
    });

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {status !== 'PUBLISHED' && (
        <Button size="xs" variant="primary" loading={pending} onClick={() => setStatus('PUBLISHED')}>
          <Check className="size-3" aria-hidden="true" />
          Approve
        </Button>
      )}
      {status === 'PENDING_REVIEW' && (
        <Button size="xs" variant="secondary" loading={pending} onClick={() => setStatus('REJECTED')}>
          <X className="size-3" aria-hidden="true" />
          Reject
        </Button>
      )}
      {status === 'PUBLISHED' && (
        <Button size="xs" variant="secondary" loading={pending} onClick={() => setStatus('ARCHIVED')}>
          Archive
        </Button>
      )}
      {canVerify && (
        <Button
          size="xs"
          variant={verified ? 'secondary' : 'primary'}
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setClubVerifiedAction(id, !verified);
              if (!result.ok) {
                toast(result.error, 'error');
                return;
              }
              toast(result.data.verified ? 'Club verified' : 'Verification removed', 'success');
              router.refresh();
            })
          }
        >
          <BadgeCheck className="size-3" aria-hidden="true" />
          {verified ? 'Unverify' : 'Verify'}
        </Button>
      )}
    </div>
  );
}
