'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { setLostFoundStatusAction } from '@/server/actions/community';

/** Lets the person who posted a listing close it once the item is returned. */
export function ResolveButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="xs"
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setLostFoundStatusAction(itemId, 'RESOLVED');
          if (!result.ok) {
            toast(result.error, 'error');
            return;
          }
          toast('Marked as resolved', 'success');
          router.refresh();
        })
      }
    >
      <CheckCircle2 className="size-3" aria-hidden="true" />
      Mark resolved
    </Button>
  );
}
