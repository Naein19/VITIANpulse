'use client';

import { useEffect, useRef } from 'react';

/**
 * Viewability beacon.
 *
 * An impression is only recorded once the creative has actually been at least
 * half visible for a second — counting on render would inflate every number and
 * make CTR meaningless. Fires at most once per mount; the server additionally
 * de-duplicates per visitor per hour.
 */
export function AdImpression({ adId }: { adId: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || sent.current) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let timer: number | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          timer = window.setTimeout(() => {
            if (sent.current) return;
            sent.current = true;
            observer.disconnect();
            void fetch(`/api/ads/${adId}/impression`, { method: 'POST', keepalive: true }).catch(() => undefined);
          }, 1000);
        } else if (timer) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(element);
    return () => {
      if (timer) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [adId]);

  return <span ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
