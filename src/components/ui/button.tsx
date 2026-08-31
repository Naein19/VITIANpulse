import { Slot } from './slot';
import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * The button. Variants map onto semantic roles, never onto raw colours.
 * `asChild` renders the styling onto a child element (usually next/link) so a
 * navigation control stays a real anchor for middle-click and keyboard users.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'pulse' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-fg border border-brand hover:bg-brand hover:border-brand shadow-xs',
  secondary:
    'bg-primary text-ink border border-line-strong hover:bg-accent hover:border-line-strong shadow-xs',
  outline: 'bg-transparent text-ink border border-line-strong hover:bg-accent hover:border-line-strong',
  ghost: 'bg-transparent text-soft border border-transparent hover:bg-accent hover:text-ink',
  danger: 'bg-danger text-white border border-danger hover:opacity-90 shadow-xs',
  pulse: 'bg-green text-[rgb(var(--hue-green)))] border border-green hover:brightness-95 font-semibold',
  link: 'bg-transparent text-link underline underline-offset-4 decoration-link/40 hover:decoration-link border-0 px-0',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-[var(--radius-xs)]',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-sm',
  md: 'h-9.5 px-4 text-[13.5px] gap-2 rounded-sm',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  asChild = false,
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,color,transform,opacity] duration-150',
        'active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        loading && 'pointer-events-none opacity-70',
        className,
      )}
      // `asChild` forwards to an anchor, which has no disabled attribute.
      {...(asChild ? {} : { disabled: disabled || loading, type: props.type ?? 'button' })}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('size-3.5 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — an icon-only control must still announce itself. */
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  active?: boolean;
  asChild?: boolean;
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  active = false,
  asChild = false,
  className,
  children,
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'size-7' : 'size-9',
        VARIANTS[variant],
        active && 'bg-brand-soft text-brand-ink border-brand-soft',
        className,
      )}
      {...(asChild ? {} : { type: props.type ?? 'button' })}
      {...props}
    >
      {children}
    </Comp>
  );
}
