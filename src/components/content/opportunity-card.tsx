import Link from 'next/link';
import { Building2, CalendarX2, MapPin, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { formatCountdown, humanise, isClosingSoon } from '@/lib/format';
import { BookmarkButton } from './bookmark-button';
import type { Opportunity } from '@/types/domain';

/** Opportunity card. Deadline proximity is the dominant visual signal. */
export function OpportunityCard({
  opportunity,
  bookmarked = false,
  signedIn = false,
  now = Date.now(),
  variant = 'grid',
}: {
  opportunity: Opportunity;
  bookmarked?: boolean;
  signedIn?: boolean;
  now?: number;
  variant?: 'grid' | 'mini';
}) {
  const href = `/opportunities/${opportunity.slug}`;
  const closed = Date.parse(opportunity.deadline) < now;
  const urgent = !closed && isClosingSoon(opportunity.deadline, now, 3);
  const soon = !closed && !urgent && isClosingSoon(opportunity.deadline, now, 7);

  if (variant === 'mini') {
    return (
      <article className="group relative border-b border-line py-2.5 last:border-0">
        <h3 className="text-[13px] font-medium leading-snug text-ink">
          <Link href={href} className="vp-clamp-2 after:absolute after:inset-0 hover:underline underline-offset-2">
            {opportunity.title}
          </Link>
        </h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-faint">
          <span className="truncate">{opportunity.organisation}</span>
          <span
            className={cn(
              'ml-auto shrink-0 font-medium',
              urgent ? 'text-danger-ink' : soon ? 'text-warning-ink' : 'text-faint',
            )}
          >
            {formatCountdown(opportunity.deadline, now)}
          </span>
        </p>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-md border bg-primary p-4 transition-[border-color,box-shadow] duration-200',
        'hover:border-line-strong hover:shadow-sm',
        urgent ? 'border-danger/40' : 'border-line',
        closed && 'opacity-65',
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="brand" size="xs">{humanise(opportunity.type)}</Badge>
        {opportunity.remote && <Badge tone="info" size="xs">Remote</Badge>}
        {urgent && <Badge tone="danger" size="xs" dot>Closing soon</Badge>}
        {soon && <Badge tone="warning" size="xs">This week</Badge>}
        {closed && <Badge tone="neutral" size="xs">Closed</Badge>}
      </div>

      <h3 className="text-[15px] font-semibold leading-snug text-ink">
        <Link href={href} className="after:absolute after:inset-0 hover:underline underline-offset-[3px]">
          {opportunity.title}
        </Link>
      </h3>

      <p className="vp-clamp-2 mt-1.5 text-[13px] leading-relaxed text-muted">{opportunity.summary}</p>

      <dl className="mt-3 space-y-1 text-[12px] text-faint">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Organisation</dt>
          <Building2 className="size-3 shrink-0" aria-hidden="true" />
          <dd className="truncate">{opportunity.organisation}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Location</dt>
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          <dd className="truncate">{opportunity.location}</dd>
        </div>
        {opportunity.stipend && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Stipend</dt>
            <Wallet className="size-3 shrink-0" aria-hidden="true" />
            <dd className="truncate">{opportunity.stipend}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-2.5 text-[11.5px]">
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium',
            urgent ? 'text-danger-ink' : soon ? 'text-warning-ink' : 'text-faint',
          )}
        >
          <CalendarX2 className="size-3" aria-hidden="true" />
          {formatCountdown(opportunity.deadline, now)}
        </span>
        <span className="relative z-1 ml-auto">
          <BookmarkButton
            targetType="OPPORTUNITY"
            targetId={opportunity.id}
            initial={bookmarked}
            signedIn={signedIn}
            size="sm"
          />
        </span>
      </div>
    </article>
  );
}
