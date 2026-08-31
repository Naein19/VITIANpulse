'use client';

import { useTransition, useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { signInAsDemoUser } from '@/server/actions/auth';

/**
 * Demo-account switcher.
 *
 * Development affordance only — `signInAsDemoUser` refuses to run once Supabase
 * is configured, so this cannot become a production backdoor. Each account maps
 * to a different role so the whole permission model is explorable.
 */
export function DemoAccountPicker({
  accounts,
  next,
}: {
  accounts: ReadonlyArray<{ id: string; email: string; displayName: string; role: string }>;
  next: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  // One representative account per role keeps the list short and legible.
  const byRole = new Map<string, (typeof accounts)[number]>();
  for (const account of accounts) if (!byRole.has(account.role)) byRole.set(account.role, account);
  const ordered = ['STUDENT', 'CLUB_ADMIN', 'EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']
    .map((role) => byRole.get(role))
    .filter((a): a is (typeof accounts)[number] => Boolean(a));

  return (
    <ul className="mt-3 divide-y divide-line overflow-hidden rounded-md border border-line bg-primary">
      {ordered.map((account) => (
        <li key={account.id}>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setActiveId(account.id);
                const result = await signInAsDemoUser(account.id, next);
                // A success redirects, so reaching here means it failed.
                if (result && !result.ok) {
                  toast(result.error, 'error');
                  setActiveId(null);
                }
              })
            }
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
              pending && activeId === account.id && 'opacity-60',
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-tertiary text-muted">
              <UserRound className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block t-sm-strong truncate text-ink">{account.displayName}</span>
              <span className="block truncate text-[11.5px] text-faint">{account.email}</span>
            </span>
            <Badge tone="outline" size="xs">
              {account.role.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </button>
        </li>
      ))}
    </ul>
  );
}
