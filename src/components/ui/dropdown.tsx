'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Menu.
 *
 * Closes on outside click, Escape and route-triggering selection; supports
 * arrow-key roving focus between items.
 */

export function Dropdown({
  trigger,
  children,
  align = 'end',
  className,
  panelClassName,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'start' | 'end';
  className?: string;
  panelClassName?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const items = panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])');
      if (!items?.length) return;
      event.preventDefault();
      const list = [...items];
      const index = list.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
      list[next]?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          className={cn(
            'vp-anim-scale-in absolute top-[calc(100%+6px)] z-50 min-w-56 overflow-hidden rounded-md',
            'border border-line-strong bg-raised py-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children, onSelect, className, icon, destructive, disabled, asChild,
}: {
  children: ReactNode;
  onSelect?: () => void;
  className?: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  asChild?: boolean;
}) {
  const classes = cn(
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors duration-100',
    'focus:outline-none focus-visible:bg-canvas-alt',
    disabled ? 'cursor-not-allowed text-faint' : 'text-soft hover:bg-canvas-alt hover:text-ink',
    destructive && 'text-danger-ink hover:bg-danger-soft',
    className,
  );

  if (asChild) {
    return (
      <div role="menuitem" tabIndex={-1} className="contents">
        <span className={classes}>{children}</span>
      </div>
    );
  }

  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onSelect} className={classes}>
      {icon}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">{children}</p>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-line" role="separator" />;
}
