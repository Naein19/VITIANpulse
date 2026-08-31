'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

const DISMISS_KEY = 'vitpulse-demo-banner-dismissed';

/**
 * Shown whenever the app is running on the seeded in-memory store.
 *
 * Requirement, not decoration: sample content must never be mistaken for a real
 * university announcement. Dismissal is remembered per browser but the banner
 * returns on a new session, and every seeded item also says so in its body.
 */
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (dismissed) return null;

  return (
    <div className="vp-no-print border-b border-warning/30 bg-warning-soft">
      <div className="mx-auto flex max-w-[var(--content-max)] items-center gap-3 px-4 py-2 sm:px-6">
        <FlaskConical className="size-3.5 shrink-0 text-warning-ink" aria-hidden="true" />
        <p className="flex-1 text-[12px] leading-snug text-warning-ink">
          <strong className="font-semibold">Demo data.</strong> This install is running on sample content for
          development. Nothing here is a real VIT-AP announcement. Connect Supabase to serve live data.
        </p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          aria-label="Dismiss demo notice"
          className="shrink-0 rounded p-1 text-warning-ink/70 transition-colors hover:text-warning-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
