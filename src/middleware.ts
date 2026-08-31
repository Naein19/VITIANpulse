import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Session refresh.
 *
 * Supabase access tokens are short-lived. Server Components cannot write
 * cookies, so the refreshed token has to be persisted here, in middleware,
 * before the request reaches a page. Without this the session silently expires
 * mid-visit and the user appears to be signed out.
 *
 * When Supabase is not configured this is a no-op — local development uses a
 * signed demo cookie that needs no refreshing.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching the user is what triggers the refresh-and-set-cookie cycle.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which never carry
     * a session and would only add latency.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|og.svg|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|webmanifest)$).*)',
  ],
};
