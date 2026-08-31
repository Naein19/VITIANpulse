'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Check, Trash2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  deleteEventAction, deletePostAction, transitionEventStatusAction, transitionPostStatusAction,
} from '@/server/actions/content';
import type { ContentStatus } from '@/types/domain';

/**
 * Publish / reject / archive controls for the content queues.
 *
 * Deliberately generic over posts and events — the two workflows are identical,
 * and duplicating them is how they drift apart.
 */
export function StatusActions({
  kind,
  id,
  status,
  canPublish,
  canDelete,
}: {
  kind: 'post' | 'event';
  id: string;
  status: ContentStatus;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const transition = (next: ContentStatus) =>
    startTransition(async () => {
      const result =
        kind === 'post'
          ? await transitionPostStatusAction(id, next)
          : await transitionEventStatusAction(id, next);
      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }
      toast(`Moved to ${next.replace(/_/g, ' ').toLowerCase()}`, 'success');
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const result = kind === 'post' ? await deletePostAction(id) : await deleteEventAction(id);
      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }
      toast('Deleted', 'success');
      router.refresh();
    });

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {canPublish && status !== 'PUBLISHED' && (
        <Button size="xs" variant="primary" loading={pending} onClick={() => transition('PUBLISHED')}>
          <Check className="size-3" aria-hidden="true" />
          Publish
        </Button>
      )}
      {canPublish && status === 'PENDING_REVIEW' && (
        <Button size="xs" variant="secondary" loading={pending} onClick={() => transition('REJECTED')}>
          <X className="size-3" aria-hidden="true" />
          Reject
        </Button>
      )}
      {canPublish && status === 'PUBLISHED' && (
        <>
          <Button size="xs" variant="secondary" loading={pending} onClick={() => transition('DRAFT')}>
            <Undo2 className="size-3" aria-hidden="true" />
            Unpublish
          </Button>
          <Button size="xs" variant="secondary" loading={pending} onClick={() => transition('ARCHIVED')}>
            <Archive className="size-3" aria-hidden="true" />
            Archive
          </Button>
        </>
      )}
      {canDelete && (
        <Button size="xs" variant="danger" loading={pending} onClick={remove} aria-label="Delete permanently">
          <Trash2 className="size-3" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
