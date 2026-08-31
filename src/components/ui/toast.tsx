'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Toasts.
 *
 * Announced through an `aria-live` region so a screen reader hears the result of
 * an action that produced no visible navigation (bookmark, follow, publish).
 */

export type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="vp-no-print pointer-events-none fixed inset-x-0 bottom-[calc(var(--vp-bottomnav-h)+12px)] z-200 flex flex-col items-center gap-2 px-4 sm:bottom-5 sm:left-auto sm:right-5 sm:items-end sm:px-0"
            role="region"
            aria-label="Notifications"
          >
            <div aria-live="polite" aria-atomic="false" className="contents">
              {toasts.map((t) => (
                <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
              ))}
            </div>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tones = {
    success: { cls: 'border-success/40 bg-success-soft text-success-ink', Icon: Check },
    error: { cls: 'border-danger/40 bg-danger-soft text-danger-ink', Icon: TriangleAlert },
    info: { cls: 'border-line-strong bg-raised text-ink', Icon: Info },
  } as const;
  const { cls, Icon } = tones[toast.tone];

  return (
    <div
      className={cn(
        'vp-anim-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-md border px-3.5 py-2.5 shadow-lg',
        cls,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-[13px] leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mr-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  // Falling back keeps components usable in tests and stories without a provider.
  return context ?? { toast: () => undefined };
}
