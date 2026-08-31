'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { deletePyqAction, reviewPyqAction } from '@/server/actions/pyq';
import type { ContentStatus } from '@/types/domain';

/** Approve, reject or delete an uploaded paper. */
export function PyqReviewActions({
  id,
  status,
  canDelete,
}: {
  id: string;
  status: ContentStatus;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const review = (next: 'PUBLISHED' | 'REJECTED' | 'ARCHIVED') =>
    startTransition(async () => {
      const result = await reviewPyqAction(id, next);
      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }
      toast(next === 'PUBLISHED' ? 'Published to the library' : `Marked ${next.toLowerCase()}`, 'success');
      router.refresh();
    });

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {status !== 'PUBLISHED' && (
        <Button size="xs" variant="primary" loading={pending} onClick={() => review('PUBLISHED')}>
          <Check className="size-3" aria-hidden="true" />
          Approve
        </Button>
      )}
      {status === 'PENDING_REVIEW' && (
        <Button size="xs" variant="secondary" loading={pending} onClick={() => review('REJECTED')}>
          <X className="size-3" aria-hidden="true" />
          Reject
        </Button>
      )}
      {status === 'PUBLISHED' && (
        <Button size="xs" variant="secondary" loading={pending} onClick={() => review('ARCHIVED')}>
          Archive
        </Button>
      )}
      {canDelete && (
        <Button
          size="xs"
          variant="danger"
          aria-label="Delete permanently"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deletePyqAction(id);
              if (!result.ok) {
                toast(result.error, 'error');
                return;
              }
              toast('Deleted', 'success');
              router.refresh();
            })
          }
        >
          <Trash2 className="size-3" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
