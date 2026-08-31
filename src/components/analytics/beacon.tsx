'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

/**
 * First-party page-view beacon.
 *
 * Sends one event per distinct path, deduplicated within the session so a
 * re-render or a back/forward navigation to the same page does not inflate the
 * count. No identifiers are attached — the server derives a rotating daily hash.
 */
function Beacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Admin traffic is internal and would distort the student-facing numbers.
    if (pathname.startsWith('/admin')) return;

    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;

    const payload = JSON.stringify({ name: 'page_view', path, entityId: null, meta: {} });

    // `sendBeacon` survives the page unloading; fetch is the fallback.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
    } else {
      void fetch('/api/analytics', {
        method: 'POST',
        body: payload,
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsBeacon() {
  // `useSearchParams` needs a Suspense boundary to keep the rest of the tree
  // eligible for static rendering.
  return (
    <Suspense fallback={null}>
      <Beacon />
    </Suspense>
  );
}
