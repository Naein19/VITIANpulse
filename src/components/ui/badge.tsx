import { cn } from '@/lib/cn';
import { humanise } from '@/lib/format';
import type { ClubCategory, EventCategory, Importance, PostCategory } from '@/types/domain';
import type { ReactNode } from 'react';

/**
 * Badges carry categorical meaning, so each content category owns a hue from the
 * token palette. That is what lets a dense feed stay scannable without icons.
 */

export type BadgeTone =
  | 'neutral' | 'brand' | 'pulse' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-tertiary text-muted border-line',
  brand: 'bg-brand-soft text-brand-ink border-transparent',
  pulse: 'bg-success-soft text-[rgb(var(--hue-green)))] border-transparent',
  success: 'bg-success-soft text-success-ink border-transparent',
  warning: 'bg-warning-soft text-warning-ink border-transparent',
  danger: 'bg-danger-soft text-danger-ink border-transparent',
  info: 'bg-info-soft text-info-ink border-transparent',
  outline: 'bg-transparent text-muted border-line-strong',
};

export interface BadgeProps {
  tone?: BadgeTone;
  size?: 'xs' | 'sm';
  className?: string;
  children: ReactNode;
  /** Renders a leading dot in the badge's own colour. */
  dot?: boolean;
}

export function Badge({ tone = 'neutral', size = 'sm', className, children, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] border font-medium',
        size === 'xs' ? 'h-4.5 px-1.5 text-[10px] tracking-wide' : 'h-5.5 px-2 text-[11px]',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* --------------------------------------------------- categorical variants */

export const POST_CATEGORY_VAR: Record<PostCategory, string> = {
  ANNOUNCEMENT: 'announcement',
  CAMPUS: 'campus',
  GUEST: 'guest',
  SPORTS: 'sports',
  CLUB: 'club',
  EVENT: 'event',
  ACADEMIC: 'academic',
  PLACEMENT: 'placement',
  OPPORTUNITY: 'opportunity',
  ALERT: 'alert',
};

export function CategoryBadge({
  category,
  size = 'xs',
  className,
}: {
  category: PostCategory;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const key = POST_CATEGORY_VAR[category];
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-[var(--radius-xs)] font-semibold uppercase tracking-[0.06em]',
        size === 'xs' ? 'h-4.5 px-1.5 text-[10px]' : 'h-5.5 px-2 text-[11px]',
        className,
      )}
      style={{
        backgroundColor: `rgb(var(--cat-${key}-bg))`,
        color: `rgb(var(--cat-${key}-fg))`,
      }}
    >
      {humanise(category)}
    </span>
  );
}

/** Event categories reuse the same hue set, mapped by closest meaning. */
export const EVENT_CATEGORY_VAR: Record<EventCategory, string> = {
  TECHNICAL: 'campus',
  CULTURAL: 'guest',
  SPORTS: 'sports',
  WORKSHOP: 'event',
  HACKATHON: 'announcement',
  COMPETITION: 'opportunity',
  GUEST_LECTURE: 'guest',
  CLUB_RECRUITMENT: 'club',
  PLACEMENT: 'placement',
  ACADEMIC: 'academic',
};

export function EventCategoryBadge({
  category,
  size = 'xs',
  className,
}: {
  category: EventCategory;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const key = EVENT_CATEGORY_VAR[category];
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-[var(--radius-xs)] font-semibold uppercase tracking-[0.06em]',
        size === 'xs' ? 'h-4.5 px-1.5 text-[10px]' : 'h-5.5 px-2 text-[11px]',
        className,
      )}
      style={{
        backgroundColor: `rgb(var(--cat-${key}-bg))`,
        color: `rgb(var(--cat-${key}-fg))`,
      }}
    >
      {humanise(category)}
    </span>
  );
}

/** Importance is deliberately restrained: urgency is a border, not a red block. */
export function ImportanceBadge({ importance }: { importance: Importance }) {
  if (importance === 'NORMAL') return null;
  return (
    <Badge tone={importance === 'URGENT' ? 'danger' : 'warning'} size="xs" dot>
      {importance === 'URGENT' ? 'Urgent' : 'Important'}
    </Badge>
  );
}

/** Marks promotional content. Required on every ad surface. */
export function SponsoredBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-4.5 items-center rounded-[var(--radius-xs)] border border-line px-1.5',
        'text-[10px] font-semibold uppercase tracking-[0.08em] text-faint',
        className,
      )}
    >
      Promoted
    </span>
  );
}


/**
 * Club categories, mapped into the same hue set. Exported so posters and
 * avatars tint from one table rather than three drifting copies.
 */
export const CLUB_CATEGORY_VAR: Record<ClubCategory, string> = {
  TECHNICAL: 'campus',
  CULTURAL: 'guest',
  SPORTS: 'sports',
  PROFESSIONAL: 'placement',
  SOCIAL: 'opportunity',
  REGIONAL: 'club',
  CREATIVE: 'announcement',
};
