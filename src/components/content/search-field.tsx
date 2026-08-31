'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Inline search box for filtered list pages.
 *
 * Submits as a real form (so it works with the keyboard and without JS) and
 * pushes to the same route with a `q` parameter, keeping the URL the source of
 * truth for the current view.
 */
export function SearchField({
  placeholder,
  defaultValue,
  basePath,
  className,
  paramName = 'q',
}: {
  placeholder: string;
  defaultValue: string;
  basePath: string;
  className?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (next: string) => {
    const trimmed = next.trim();
    router.push(trimmed ? `${basePath}?${paramName}=${encodeURIComponent(trimmed)}` : basePath);
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
      className={cn('relative', className)}
    >
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        name={paramName}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'h-8 w-full min-w-52 rounded-sm border border-line-strong bg-primary pl-8 pr-8 text-[13px] text-ink',
          'placeholder:text-faint focus:outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/25',
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue('');
            submit('');
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint transition-colors hover:text-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
