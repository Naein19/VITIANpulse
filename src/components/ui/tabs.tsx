'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

/**
 * Tabs.
 *
 * Rendered as links so tab state lives in the URL and is shareable, indexable
 * and back-button friendly — the same reason the events views and search tabs
 * are routed rather than local state.
 */

export interface TabItem {
  key: string;
  label: string;
  href: string;
  count?: number;
  icon?: ReactNode;
}

export function Tabs({
  items,
  activeKey,
  className,
  size = 'md',
}: {
  items: readonly TabItem[];
  activeKey: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('vp-scroll-x -mb-px border-b border-line', className)}>
      <nav className="flex min-w-max gap-0.5" aria-label="Sections">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              scroll={false}
              className={cn(
                'relative inline-flex items-center gap-2 border-b-2 font-medium transition-colors duration-150',
                size === 'sm' ? 'px-3 py-2 text-[12.5px]' : 'px-3.5 py-2.5 text-[13.5px]',
                active
                  ? 'border-brand text-ink'
                  : 'border-transparent text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'vp-numeric rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[11px] font-semibold',
                    active ? 'bg-brand-soft text-brand-ink' : 'bg-sunken text-faint',
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Compact segmented control for view switches (list / calendar / timeline). */
export function SegmentedControl({
  items,
  activeKey,
  className,
}: {
  items: readonly TabItem[];
  activeKey: string;
  className?: string;
}) {
  return (
    <div
      className={cn('inline-flex rounded-sm border border-line-strong bg-sunken p-0.5', className)}
      role="group"
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'true' : undefined}
            scroll={false}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150',
              active ? 'bg-raised text-ink shadow-xs' : 'text-muted hover:text-ink',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Filter chips. `href`-driven so filters survive a refresh and are linkable. */
export function FilterChips({
  items,
  activeKey,
  className,
  label,
}: {
  items: readonly TabItem[];
  activeKey: string;
  className?: string;
  label: string;
}) {
  return (
    <div className={cn('vp-scroll-x flex gap-1.5 pb-1', className)} role="group" aria-label={label}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-pressed={active}
            scroll={false}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150',
              active
                ? 'border-brand bg-brand-soft text-brand-ink'
                : 'border-line-strong bg-surface text-muted hover:border-line-heavy hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="vp-numeric text-[11px] opacity-60">{item.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
