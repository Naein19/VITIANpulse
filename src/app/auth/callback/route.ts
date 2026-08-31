import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabase } from '@/lib/env';
import { getSupabaseServerClient } from '@/server/supabase/clients';
import { ensureProfile } from '@/server/actions/auth';
import { safeInternalPath } from '@/lib/sanitize';

/**
 * Magic-link callback.
 *
 * Exchanges the one-time code for a session, provisions a profile row on first
 * sign-in, then redirects. The `next` parameter is passed through
 * `safeInternalPath`, which is what stops this becoming an open redirect.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const next = safeInternalPath(url.searchParams.get('next') ?? '') ?? '/dashboard';

  if (!hasSupabase) {
    return NextResponse.redirect(new URL('/login?error=not-configured', url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing-code', url.origin));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn('[vitpulse] auth callback failed:', error.message);
    return NextResponse.redirect(new URL('/login?error=invalid-link', url.origin));
  }

  await ensureProfile();
  return NextResponse.redirect(new URL(next, url.origin));
}
