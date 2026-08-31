'use client';

import { useActionState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/misc';
import { signInWithEmail } from '@/server/actions/auth';

/**
 * Magic-link sign-in.
 *
 * Progressive: it is a real `<form>` with a server action, so it submits and
 * validates without JavaScript. The rate limit lives server-side (8 attempts
 * per 10 minutes per identity), not in this component.
 */
export function LoginForm({ supabaseReady, next }: { supabaseReady: boolean; next: string }) {
  const [state, formAction, pending] = useActionState(signInWithEmail, null);

  if (state?.ok) {
    return (
      <Alert tone="success" title="Check your inbox">
        We sent a one-time sign-in link to that address. It expires shortly, so use it soon. You can close this tab —
        the link opens VITPulse signed in.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}

      <Field
        label="University email"
        htmlFor="login-email"
        required
        description="We send a one-time link — there is no password."
      >
        <Input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@vitapstudent.ac.in"
          disabled={!supabaseReady}
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending} disabled={!supabaseReady}>
        {supabaseReady ? (
          <>
            <Send className="size-3.5" aria-hidden="true" />
            Email me a sign-in link
          </>
        ) : (
          <>
            <Mail className="size-3.5" aria-hidden="true" />
            Email sign-in needs Supabase
          </>
        )}
      </Button>
    </form>
  );
}
