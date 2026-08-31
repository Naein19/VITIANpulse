import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap, Mail, ShieldCheck } from 'lucide-react';
import { WindowContent } from '@/components/shell/app-shell';
import { Alert } from '@/components/ui/misc';
import { LoginForm } from '@/components/auth/login-form';
import { DemoAccountPicker } from '@/components/auth/demo-account-picker';
import { pageMetadata } from '@/lib/metadata';
import { getSessionUser } from '@/server/auth/session';
import { hasSupabase, allowedEmailDomains } from '@/lib/env';
import { DEMO_ACCOUNTS } from '@/seed';
import { safeInternalPath } from '@/lib/sanitize';
import { param, type SearchParams } from '@/lib/query-params';

/**
 * Sign in.
 *
 * With Supabase configured this sends a magic-link OTP restricted to campus
 * email domains. Without it, the seeded demo accounts are offered so every role
 * in the RBAC model can be exercised locally.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Sign in',
  description: 'Sign in to VITPulse with your university email address.',
  path: '/login',
  noIndex: true,
});

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser();
  const params = await searchParams;
  const next = safeInternalPath(param(params, 'next') ?? '') ?? '/dashboard';

  if (user) redirect(next);

  return (
    <WindowContent className="max-w-4xl">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="min-w-0">
          <p className="t-eyebrow mb-2 text-faint">Welcome back</p>
          <h1 className="t-h2 text-ink">Sign in to VITPulse</h1>
          <p className="t-prose mt-3 max-w-lg text-soft">
            Following clubs, saving events, bookmarking papers and registering for anything all need an account. Use
            your university email address.
          </p>

          <div className="mt-7 max-w-md">
            <LoginForm supabaseReady={hasSupabase} next={next} />
          </div>

          {!hasSupabase && (
            <div className="mt-8 max-w-md">
              <Alert tone="warning" title="Running on demo data">
                Supabase is not configured, so email sign-in is unavailable. Pick a demo account below to explore every
                role — student, club admin, editor, moderator and administrator.
              </Alert>
              <DemoAccountPicker accounts={DEMO_ACCOUNTS} next={next} />
            </div>
          )}

          <ul className="mt-9 grid max-w-md gap-3 border-t border-line pt-6">
            <Assurance icon={ShieldCheck} title="No password to remember">
              Sign-in is a one-time link sent to your university inbox. VITPulse never stores a password.
            </Assurance>
            <Assurance icon={GraduationCap} title="Students only">
              Only {allowedEmailDomains.map((d) => `@${d}`).join(' and ')} addresses can create an account.
            </Assurance>
            <Assurance icon={Mail} title="You control the noise">
              Notification preferences are per category and you can turn any of them off at any time.
            </Assurance>
          </ul>
        </div>

        <aside className="min-w-0">
          <div className="rounded-md border border-line bg-tertiary p-4">
            <p className="t-label mb-3 text-faint">What an account unlocks</p>
            <ul className="space-y-2.5">
              {[
                ['Follow clubs', 'Their events and updates move to the top of your feed.'],
                ['Register for events', 'Reserve a seat and get a reminder before it starts.'],
                ['Save anything', 'Events, papers, opportunities and resources in one list.'],
                ['Personalised ranking', 'Your branch, year and interests shape what you see first.'],
                ['Upload PYQs', 'Contribute papers back to the library for the next batch.'],
              ].map(([title, detail]) => (
                <li key={title} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green" aria-hidden="true" />
                  <span>
                    <span className="block t-sm-strong text-ink">{title}</span>
                    <span className="block text-[12.5px] leading-relaxed text-muted">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-faint">
            By signing in you agree to keep VITPulse a useful, non-abusive space. Content is moderated and accounts can
            be suspended.{' '}
            <Link href="/" className="underline underline-offset-2 hover:text-muted">
              Back to home
            </Link>
          </p>
        </aside>
      </div>
    </WindowContent>
  );
}

function Assurance({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm border border-line bg-tertiary text-muted">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block t-sm-strong text-ink">{title}</span>
        <span className="block text-[12.5px] leading-relaxed text-muted">{children}</span>
      </span>
    </li>
  );
}
