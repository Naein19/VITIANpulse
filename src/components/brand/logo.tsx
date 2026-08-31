import { cn } from '@/lib/cn';

/**
 * The VITPulse wordmark.
 *
 * The mark is a pulse trace that resolves into a peak — drawn as a single path
 * so it stays crisp at any size and inherits the theme's colours.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={cn('size-6 shrink-0', className)} aria-hidden="true">
      <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="7" className="fill-ink" />
      <path
        d="M4.5 15.4h3.2l2.1-5.6 3.4 9.4 2.6-6.1 1.6 2.3h5.9"
        stroke="rgb(var(--hue-green))"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Wordmark({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15.5px] font-extrabold tracking-[-0.03em] text-ink">
          VIT<span className="text-link">Pulse</span>
        </span>
        {showTagline && (
          <span className="mt-0.5 text-[10px] font-medium tracking-tight text-faint">
            Everything happening at VIT-AP
          </span>
        )}
      </span>
    </span>
  );
}
