'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Pause, Play, Square, X } from 'lucide-react';
import { Badge, SponsoredBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { Meter } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { formatCount, formatDate, formatPercent, humanise } from '@/lib/format';
import { reviewAdAction, setAdRunStateAction } from '@/server/actions/ads';
import type { AdPerformance } from '@/server/db/repositories/ads';
import type { AdWithClub } from '@/types/domain';

/**
 * One campaign: the creative exactly as students see it, plus its numbers and
 * the review controls.
 */
export function AdReviewCard({ ad, performance }: { ad: AdWithClub; performance: AdPerformance }) {
  const router = useRouter();
  const { toast } = useToast();
  const [deciding, setDeciding] = useState<string | null>(null);

  const [, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await reviewAdAction(null, formData);
      if (result.ok) {
        toast(`Campaign ${result.data.status.toLowerCase()}`, 'success');
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
      setDeciding(null);
      return result;
    },
    null,
  );

  const setRunState = (paused: boolean) => async () => {
    const result = await setAdRunStateAction(ad.id, paused);
    if (!result.ok) {
      toast(result.error, 'error');
      return;
    }
    toast(paused ? 'Campaign paused' : 'Campaign resumed', 'success');
    router.refresh();
  };

  const tone =
    ad.status === 'APPROVED' ? 'success'
    : ad.status === 'PENDING_REVIEW' ? 'warning'
    : ad.status === 'REJECTED' ? 'danger' : 'neutral';

  return (
    <article className="rounded-md border border-line bg-primary">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <Badge tone={tone} size="xs">{humanise(ad.status)}</Badge>
        <Badge tone="outline" size="xs">{humanise(ad.placement)}</Badge>
        <span className="t-sm-strong truncate text-ink">{ad.name}</span>
        <span className="ml-auto text-[11.5px] text-faint">
          {formatDate(ad.startsAt)} → {formatDate(ad.endsAt)}
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* ------------------------------------------- creative, as rendered */}
        <div>
          <p className="t-label mb-2 text-faint">Creative preview</p>
          <div className="rounded-md border border-dashed border-line-strong bg-tertiary p-3.5">
            <div className="mb-1.5 flex items-center gap-2">
              <SponsoredBadge />
              {ad.club && <span className="text-[11.5px] font-medium text-muted">{ad.club.name}</span>}
            </div>
            <p className="t-strong leading-snug text-ink">{ad.headline}</p>
            <p className="mt-1 t-xs leading-relaxed text-muted">{ad.body}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-link">
              {ad.ctaLabel}
              <ExternalLink className="size-3" aria-hidden="true" />
            </span>
          </div>

          <p className="mt-2 break-all text-[11.5px] text-faint">
            Destination: <span className="font-mono">{ad.ctaUrl}</span>
          </p>
          {ad.reviewNote && (
            <p className="mt-1.5 text-[11.5px] text-muted">Last review note: {ad.reviewNote}</p>
          )}
        </div>

        {/* --------------------------------------------------- performance */}
        <div className="space-y-3">
          <p className="t-label text-faint">Performance</p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-sm border border-line bg-tertiary px-2 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-faint">Impr.</dt>
              <dd className="vp-numeric text-[15px] font-bold text-ink">{formatCount(ad.impressionCount)}</dd>
            </div>
            <div className="rounded-sm border border-line bg-tertiary px-2 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-faint">Clicks</dt>
              <dd className="vp-numeric text-[15px] font-bold text-ink">{formatCount(ad.clickCount)}</dd>
            </div>
            <div className="rounded-sm border border-line bg-tertiary px-2 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-faint">CTR</dt>
              <dd className="vp-numeric text-[15px] font-bold text-ink">{formatPercent(performance.ctr, 1)}</dd>
            </div>
          </dl>

          {ad.impressionCap !== null && (
            <div>
              <div className="mb-1 flex justify-between text-[11.5px] text-faint">
                <span>Impression cap</span>
                <span className="vp-numeric">
                  {formatCount(ad.impressionCount)} / {formatCount(ad.impressionCap)}
                </span>
              </div>
              <Meter
                value={ad.impressionCount}
                max={ad.impressionCap}
                label="Impression cap usage"
                tone={(performance.capUsed ?? 0) > 90 ? 'warning' : 'brand'}
              />
            </div>
          )}

          <p className="text-[11.5px] text-faint">
            {performance.daysRemaining > 0
              ? `${performance.daysRemaining} days remaining · priority ${ad.priority}`
              : 'Campaign window has ended'}
          </p>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        {deciding ? (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="adId" value={ad.id} />
            <input type="hidden" name="decision" value={deciding} />
            <Field
              label={`Note for ${deciding.toLowerCase()}`}
              htmlFor={`ad-note-${ad.id}`}
              description="Sent to the club's admins and recorded in the audit log."
            >
              <Textarea id={`ad-note-${ad.id}`} name="note" rows={2} maxLength={400} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDeciding(null)}>Cancel</Button>
              <Button
                size="sm"
                variant={deciding === 'REJECTED' ? 'danger' : 'primary'}
                type="submit"
                loading={pending}
              >
                Confirm {deciding.toLowerCase()}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ad.status !== 'APPROVED' && (
              <Button size="sm" variant="primary" onClick={() => setDeciding('APPROVED')}>
                <Check className="size-3.5" aria-hidden="true" />
                Approve
              </Button>
            )}
            {ad.status === 'PENDING_REVIEW' && (
              <Button size="sm" variant="danger" onClick={() => setDeciding('REJECTED')}>
                <X className="size-3.5" aria-hidden="true" />
                Reject
              </Button>
            )}
            {ad.status === 'APPROVED' && (
              <Button size="sm" variant="secondary" onClick={setRunState(true)}>
                <Pause className="size-3.5" aria-hidden="true" />
                Pause
              </Button>
            )}
            {ad.status === 'PAUSED' && (
              <Button size="sm" variant="secondary" onClick={setRunState(false)}>
                <Play className="size-3.5" aria-hidden="true" />
                Resume
              </Button>
            )}
            {(ad.status === 'APPROVED' || ad.status === 'PAUSED') && (
              <Button size="sm" variant="ghost" onClick={() => setDeciding('ENDED')}>
                <Square className="size-3.5" aria-hidden="true" />
                End campaign
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
