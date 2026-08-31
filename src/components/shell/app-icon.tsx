import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * A desktop application icon.
 *
 * Treatment taken from the reference: a flat glyph sitting directly on the
 * wallpaper with no tile, plate or border, under a plain two-line label.
 * Legibility over a busy photographic background comes from a soft drop shadow
 * on the glyph and a text shadow on the label, not from a card behind them —
 * that is what keeps the desktop feeling like a desktop.
 */
export function AppIcon({
  icon: Icon,
  label,
  active,
  size = 'md',
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  size?: 'md' | 'lg';
}) {
  return (
    <>
      <span
        className={cn(
          'flex items-center justify-center transition-transform duration-200',
          'group-hover:-translate-y-0.5 group-active:translate-y-0',
          size === 'lg' ? 'size-11' : 'size-9',
        )}
      >
        <Icon
          className={cn(
            size === 'lg' ? 'size-8' : 'size-7',
            'stroke-[1.75] text-ink transition-opacity',
            active ? 'opacity-100' : 'opacity-90 group-hover:opacity-100',
          )}
          style={{
            // A halo in the *opposite* polarity to the ink, so the glyph holds
            // up over both the open sky and the busy illustration.
            filter:
              'drop-shadow(0 0 3px rgb(var(--bg-primary) / 0.95)) drop-shadow(0 1px 3px rgb(var(--bg-primary) / 0.8))',
          }}
          aria-hidden="true"
        />
      </span>
      <span
        className={cn(
          'vp-clamp-2 w-full text-center text-[11px] font-semibold leading-[1.2] text-ink transition-opacity',
          active ? 'opacity-100' : 'opacity-90',
        )}
        style={{
          textShadow:
            '0 0 3px rgb(var(--bg-primary) / 0.95), 0 1px 4px rgb(var(--bg-primary) / 0.85)',
        }}
      >
        {label}
      </span>
    </>
  );
}
