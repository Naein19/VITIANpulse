'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './button';

/**
 * Dialog and mobile sheet.
 *
 * Implemented on the native `<dialog>` semantics we actually need — focus trap,
 * Escape to close, scroll lock, restore focus on close — rather than pulling in
 * a dependency. `variant="sheet"` slides from the bottom, which is what the
 * mobile filter drawers use.
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'dialog' | 'sheet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl' } as const;

export function Modal({
  open, onClose, title, description, children, footer, variant = 'dialog', size = 'md', className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    // Focus the panel itself so screen readers announce the dialog title.
    const timer = window.setTimeout(() => panelRef.current?.focus(), 20);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-100 flex',
        variant === 'sheet' ? 'items-end' : 'items-start justify-center p-4 sm:items-center',
      )}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="vp-anim-fade-in absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex w-full flex-col border border-line-strong bg-primary shadow-lg outline-none',
          variant === 'sheet'
            ? 'vp-anim-slide-up max-h-[88vh] rounded-t-lg'
            : cn('vp-anim-scale-in max-h-[86vh] rounded-lg', SIZES[size]),
          className,
        )}
      >
        {variant === 'sheet' && (
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
        )}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
          </div>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-primary px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
