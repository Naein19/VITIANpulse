'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Route-level error boundary.
 *
 * Shows a recoverable message and a retry — never the raw error text, which can
 * contain query fragments or internal identifiers. The digest is surfaced so a
 * student can quote it in a bug report.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[vitpulse] render error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="mb-5 inline-flex size-12 items-center justify-center rounded-md border border-danger/30 bg-danger-soft text-danger-ink">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <h1 className="text-[26px] leading-tight text-ink sm:text-[30px]">Something went wrong here</h1>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted">
        This section failed to load. It is usually temporary — try again, and if it keeps happening, let the VITPulse
        team know.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11.5px] text-faint">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={reset}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
