'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Form primitives.
 *
 * Every control is wrapped by `Field`, which owns the label association, the
 * description and the error message wiring (`aria-describedby`,
 * `aria-invalid`). That makes it structurally hard to ship an unlabelled input.
 */

const CONTROL_BASE =
  'w-full rounded-sm border bg-raised px-3 text-[13.5px] text-ink placeholder:text-faint ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-faint';

export interface FieldProps {
  label: string;
  htmlFor: string;
  description?: ReactNode;
  error?: string | string[];
  required?: boolean;
  className?: string;
  children: ReactNode;
  /** Hides the visual label while keeping it for assistive tech. */
  srOnlyLabel?: boolean;
}

export function Field({
  label, htmlFor, description, error, required, className, children, srOnlyLabel,
}: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          'block text-[12.5px] font-medium text-soft',
          srOnlyLabel && 'sr-only',
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      {description && !srOnlyLabel && (
        <p id={`${htmlFor}-description`} className="text-[12px] leading-relaxed text-faint">
          {description}
        </p>
      )}
      {children}
      {message && (
        <p id={`${htmlFor}-error`} role="alert" className="text-[12px] font-medium text-danger-ink">
          {message}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  sizing?: 'sm' | 'md';
}

export function Input({ className, invalid, sizing = 'md', ...props }: InputProps) {
  return (
    <input
      className={cn(
        CONTROL_BASE,
        sizing === 'sm' ? 'h-8' : 'h-9.5',
        invalid ? 'border-danger' : 'border-line-strong',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, rows = 5, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        CONTROL_BASE,
        'resize-y py-2 leading-relaxed',
        invalid ? 'border-danger' : 'border-line-strong',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  sizing?: 'sm' | 'md';
}

export function Select({ className, invalid, sizing = 'md', children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          CONTROL_BASE,
          'cursor-pointer appearance-none pr-8',
          sizing === 'sm' ? 'h-8' : 'h-9.5',
          invalid ? 'border-danger' : 'border-line-strong',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Checkbox({
  label, description, className, id, ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer rounded-[3px] border border-line-strong bg-raised',
          'accent-[var(--vp-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        )}
        {...props}
      />
      <label htmlFor={inputId} className="cursor-pointer select-none text-[13px] leading-snug text-soft">
        {label}
        {description && <span className="mt-0.5 block text-[12px] text-faint">{description}</span>}
      </label>
    </div>
  );
}

/** An accessible switch backed by a real checkbox input. */
export function Switch({
  label, description, className, id, ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={inputId} className="cursor-pointer select-none">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{description}</span>}
      </label>
      <span className="relative inline-flex shrink-0">
        <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
        <span
          aria-hidden="true"
          className={cn(
            'block h-5 w-9 cursor-pointer rounded-full border border-line-strong bg-sunken transition-colors duration-200',
            'peer-checked:border-brand peer-checked:bg-brand',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-0.5 top-0.5 size-4 rounded-full bg-raised shadow-xs',
            'transition-transform duration-200 peer-checked:translate-x-4',
          )}
        />
      </span>
    </div>
  );
}

/** Groups related controls with a legend, for multi-field sections. */
export function FieldSet({ legend, description, children, className }: {
  legend: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('space-y-3', className)}>
      <legend className="text-[13px] font-semibold text-ink">{legend}</legend>
      {description && <p className="text-[12px] text-muted">{description}</p>}
      {children}
    </fieldset>
  );
}
