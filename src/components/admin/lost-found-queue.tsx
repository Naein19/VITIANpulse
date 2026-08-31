'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/format';
import { setLostFoundStatusAction } from '@/server/actions/community';
import type { LostFoundItem } from '@/types/domain';

/**
 * Approval queue for lost & found listings.
 *
 * The reviewer sees the contact value so they can check it is the poster's own
 * detail and not somebody else's — that check is the reason this queue exists.
 */
export function LostFoundQueue({ items }: { items: readonly LostFoundItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const decide = (id: string, status: 'OPEN' | 'REJECTED') =>
    startTransition(async () => {
      const result = await setLostFoundStatusAction(id, status);
      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }
      toast(status === 'OPEN' ? 'Published' : 'Rejected', 'success');
      router.refresh();
    });

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border border-line bg-primary p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={item.kind === 'LOST' ? 'warning' : 'success'} size="xs">
              {item.kind === 'LOST' ? 'Lost' : 'Found'}
            </Badge>
            <time className="ml-auto text-[11.5px] text-faint" dateTime={item.happenedOn}>
              {formatDate(item.happenedOn)}
            </time>
          </div>

          <h2 className="t-sm-strong text-ink">{item.title}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{item.description}</p>

          <dl className="mt-2.5 grid gap-1 text-[12px] sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-faint">Location</dt>
              <dd className="text-soft">{item.locationText}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-faint">Contact</dt>
              <dd className="break-all text-soft">
                {item.contactMethod} · {item.contactValue}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="primary" loading={pending} onClick={() => decide(item.id, 'OPEN')}>
              <Check className="size-3.5" aria-hidden="true" />
              Publish
            </Button>
            <Button size="sm" variant="danger" loading={pending} onClick={() => decide(item.id, 'REJECTED')}>
              <X className="size-3.5" aria-hidden="true" />
              Reject
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
