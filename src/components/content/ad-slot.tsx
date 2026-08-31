import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SponsoredBadge } from '@/components/ui/badge';
import { selectAds } from '@/server/db/repositories/ads';
import { AdImpression } from './ad-impression';
import type { AdPlacement, AdWithClub } from '@/types/domain';

/**
 * Promotional slot.
 *
 * Three rules hold on every ad surface:
 *  1. Creatives are plain text rendered as React children — no HTML, ever.
 *  2. The slot is always labelled "Promoted" and visually distinct from content.
 *  3. Clicks go through /api/ads/[id]/click so the destination is re-validated
 *     and counted once, and the referrer is stripped.
 *
 * Renders nothing at all when no campaign is eligible — an empty ad frame is
 * worse than no ad.
 */
export async function AdSlot({
  placement,
  className,
  variant = 'card',
}: {
  placement: AdPlacement;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}) {
  const ads = await selectAds({ placement, limit: 1 });
  const ad = ads[0];
  if (!ad) return null;

  return <AdCreative ad={ad} variant={variant} className={className} />;
}

export function AdCreative({
  ad,
  variant = 'card',
  className,
}: {
  ad: AdWithClub;
  variant?: 'banner' | 'card' | 'inline';
  className?: string;
}) {
  const href = `/api/ads/${ad.id}/click`;

  if (variant === 'banner') {
    return (
      <aside
        aria-label="Promoted"
        className={cn(
          'relative overflow-hidden rounded-md border border-brand/30 bg-brand-soft/60',
          'px-4 py-3.5 sm:px-5',
          className,
        )}
      >
        <AdImpression adId={ad.id} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <SponsoredBadge />
              {ad.club && <span className="text-[11.5px] font-medium text-brand-ink">{ad.club.name}</span>}
            </div>
            <p className="text-[15px] font-semibold leading-snug text-ink">{ad.headline}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{ad.body}</p>
          </div>
          <a
            href={href}
            rel="nofollow sponsored noopener"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm bg-brand px-4 text-[13px] font-medium text-brand-fg transition-colors hover:bg-brand"
          >
            {ad.ctaLabel}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </aside>
    );
  }

  if (variant === 'inline') {
    return (
      <aside
        aria-label="Promoted"
        className={cn('relative rounded-md border border-dashed border-line-strong bg-tertiary p-3.5', className)}
      >
        <AdImpression adId={ad.id} />
        <div className="mb-1.5 flex items-center gap-2">
          <SponsoredBadge />
          {ad.club && <span className="text-[11.5px] font-medium text-muted">{ad.club.shortName}</span>}
        </div>
        <p className="text-[14px] font-semibold leading-snug text-ink">{ad.headline}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{ad.body}</p>
        <a
          href={href}
          rel="nofollow sponsored noopener"
          className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-link hover:underline underline-offset-2"
        >
          {ad.ctaLabel}
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Promoted"
      className={cn('relative rounded-md border border-line bg-primary p-3.5', className)}
    >
      <AdImpression adId={ad.id} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <SponsoredBadge />
        {ad.club && <span className="truncate text-[11.5px] font-medium text-muted">{ad.club.shortName}</span>}
      </div>
      <p className="text-[13.5px] font-semibold leading-snug text-ink">{ad.headline}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{ad.body}</p>
      <a
        href={href}
        rel="nofollow sponsored noopener"
        className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-sm border border-line-strong bg-primary text-[12.5px] font-medium text-ink transition-colors hover:border-line-strong"
      >
        {ad.ctaLabel}
        <ArrowUpRight className="size-3" aria-hidden="true" />
      </a>
    </aside>
  );
}
