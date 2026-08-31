'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/toast';

/**
 * Share control.
 *
 * Uses the Web Share sheet where the browser offers it (mobile), and falls back
 * to copying the canonical URL. Both paths give explicit feedback.
 */
export function ShareButton({
  title,
  path,
  withLabel = false,
  className,
}: {
  title: string;
  path: string;
  withLabel?: boolean;
  className?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const share = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}${path}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // The user dismissed the sheet, or sharing is unavailable — fall through.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy the link', 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`Share ${title}`}
      title="Share"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm text-faint transition-colors duration-150 hover:text-ink',
        withLabel ? 'h-8 border border-line-strong bg-surface px-2.5 text-[12.5px] font-medium hover:border-line-heavy' : 'p-1',
        className,
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Share2 className="size-3.5" aria-hidden="true" />}
      {withLabel && <span>{copied ? 'Copied' : 'Share'}</span>}
    </button>
  );
}
