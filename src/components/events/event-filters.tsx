'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { SCHOOLS } from '@/types/domain';

/**
 * Secondary event filters.
 *
 * A persistent rail on desktop; on mobile the same controls open in a bottom
 * sheet, which is why this is a client component — the filter values themselves
 * still live in the URL.
 */

interface FilterState {
  school: string;
  club: string;
  free: string;
  registration: string;
}

export function EventFilters({
  clubs,
  current,
  buildHref,
}: {
  clubs: ReadonlyArray<{ id: string; name: string }>;
  current: FilterState;
  buildHref: (overrides: Record<string, string | number | undefined>) => string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = Object.values(current).filter(Boolean).length;

  const groups = (
    <div className="space-y-6">
      <FilterGroup title="School">
        <FilterLink href={buildHref({ school: undefined })} active={!current.school}>
          All schools
        </FilterLink>
        {SCHOOLS.map((school) => (
          <FilterLink key={school} href={buildHref({ school })} active={current.school === school}>
            {school.replace(/_/g, ' ')}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="Cost">
        <FilterLink href={buildHref({ free: undefined })} active={!current.free}>
          Free and paid
        </FilterLink>
        <FilterLink href={buildHref({ free: 'true' })} active={current.free === 'true'}>
          Free only
        </FilterLink>
        <FilterLink href={buildHref({ free: 'false' })} active={current.free === 'false'}>
          Paid only
        </FilterLink>
      </FilterGroup>

      <FilterGroup title="Registration">
        <FilterLink href={buildHref({ registration: undefined })} active={!current.registration}>
          Any
        </FilterLink>
        <FilterLink href={buildHref({ registration: 'required' })} active={current.registration === 'required'}>
          Registration required
        </FilterLink>
        <FilterLink href={buildHref({ registration: 'open' })} active={current.registration === 'open'}>
          Open entry
        </FilterLink>
      </FilterGroup>

      <FilterGroup title="Organising club">
        <FilterLink href={buildHref({ club: undefined })} active={!current.club}>
          All clubs
        </FilterLink>
        <div className="max-h-64 overflow-y-auto">
          {clubs.map((club) => (
            <FilterLink key={club.id} href={buildHref({ club: club.id })} active={current.club === club.id}>
              {club.name}
            </FilterLink>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <>
      {/* -------------------------------------------------------- desktop rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--vp-header-h)+16px)]">
          <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink">Filters</h2>
            {activeCount > 0 && (
              <Link
                href={buildHref({ school: undefined, club: undefined, free: undefined, registration: undefined })}
                className="text-[11.5px] font-medium text-brand hover:underline underline-offset-2"
              >
                Clear
              </Link>
            )}
          </div>
          {groups}
        </div>
      </aside>

      {/* ------------------------------------------------------- mobile sheet */}
      <div className="lg:hidden">
        <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)} className="w-full">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          More filters
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-brand px-1.5 text-[10.5px] font-bold text-[var(--vp-brand-contrast)]">
              {activeCount}
            </span>
          )}
        </Button>

        <Modal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filter events"
          variant="sheet"
          footer={
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={buildHref({ school: undefined, club: undefined, free: undefined, registration: undefined })}
                  onClick={() => setSheetOpen(false)}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  Clear all
                </Link>
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSheetOpen(false)}>
                Show results
              </Button>
            </>
          }
        >
          <div onClick={() => setSheetOpen(false)}>{groups}</div>
        </Modal>
      </div>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-faint">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'block truncate rounded-sm px-2 py-1.5 text-[13px] transition-colors',
        active ? 'bg-brand-soft font-medium text-brand-ink' : 'text-muted hover:bg-canvas-alt hover:text-ink',
      )}
    >
      {children}
    </Link>
  );
}
