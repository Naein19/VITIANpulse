'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Ticket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cancelRegistrationAction, registerForEventAction, trackRegistrationClick } from '@/server/actions/engagement';
import type { RegistrationStatus } from '@/types/domain';

/**
 * Event registration.
 *
 * A real seat reservation: it writes a registration row, increments the seat
 * counter and schedules a reminder notification. When the event is already full
 * the server returns WAITLISTED rather than failing, and the button says so.
 *
 * Events that register through an external form get a tracked outbound link
 * instead, so the click is still measured.
 */
export function RegisterButton({
  eventId,
  eventSlug,
  signedIn,
  status,
  disabled,
  full,
  externalUrl,
}: {
  eventId: string;
  eventSlug: string;
  signedIn: boolean;
  status: RegistrationStatus | null;
  disabled: boolean;
  full: boolean;
  externalUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<RegistrationStatus | null>(status);

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void trackRegistrationClick({ id: eventId, slug: eventSlug })}
        className="inline-flex h-9.5 w-full items-center justify-center gap-2 rounded-sm bg-brand px-4 text-[13.5px] font-medium text-brand-fg transition-colors hover:bg-brand"
      >
        Register on the organiser&rsquo;s form
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    );
  }

  if (!signedIn) {
    return (
      <Button variant="primary" className="w-full" asChild>
        <a href={`/login?next=/events/${eventSlug}`}>
          <Ticket className="size-3.5" aria-hidden="true" />
          Sign in to register
        </a>
      </Button>
    );
  }

  if (current === 'REGISTERED' || current === 'WAITLISTED' || current === 'ATTENDED') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-sm border border-success/40 bg-success-soft px-3 py-2.5 text-[13px] font-medium text-success-ink">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          {current === 'WAITLISTED' ? 'You are on the waitlist' : "You're registered"}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelRegistrationAction(eventId);
              if (!result.ok) {
                toast(result.error, 'error');
                return;
              }
              setCurrent(null);
              toast('Registration cancelled', 'info');
              router.refresh();
            })
          }
        >
          <X className="size-3.5" aria-hidden="true" />
          Cancel registration
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      className="w-full"
      disabled={disabled}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await registerForEventAction(eventId);
          if (!result.ok) {
            toast(result.error, 'error');
            return;
          }
          setCurrent(result.data.status);
          toast(
            result.data.status === 'WAITLISTED'
              ? 'Added to the waitlist — we will notify you if a seat opens'
              : "You're registered. A reminder is in your notifications.",
            'success',
          );
          router.refresh();
        })
      }
    >
      <Ticket className="size-3.5" aria-hidden="true" />
      {disabled ? 'Registration closed' : full ? 'Join the waitlist' : 'Register for this event'}
    </Button>
  );
}
