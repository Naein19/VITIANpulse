import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Not allowed' };

/** Shown when a signed-in user reaches a surface their role cannot access. */
export default function Forbidden() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="mb-5 inline-flex size-12 items-center justify-center rounded-md border border-line bg-primary text-faint">
        <ShieldOff className="size-5" aria-hidden="true" />
      </span>
      <p className="vp-numeric text-[13px] font-semibold uppercase tracking-[0.16em] text-faint">Error 403</p>
      <h1 className="mt-2 text-[28px] leading-tight text-ink sm:text-[32px]">You do not have access to this</h1>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted">
        This area is limited to a specific role. If you think you should have access, ask an administrator to update
        your role.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" asChild>
          <Link href="/dashboard">Go to my dashboard</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
