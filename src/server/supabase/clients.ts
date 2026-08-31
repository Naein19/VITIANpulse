import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env, hasSupabase, hasSupabaseAdmin } from '@/lib/env';

/**
 * Supabase clients.
 *
 * `getSupabaseServerClient` is the default: it carries the user's session
 * cookie, so every query it issues is evaluated under Row Level Security.
 *
 * `getSupabaseServiceClient` holds the service-role key and bypasses RLS. It is
 * only imported by `getPrivilegedStore()`, which callers reach after an explicit
 * permission check. The key is read from a non-`NEXT_PUBLIC_` variable inside a
 * `server-only` module, so it can never be bundled into client JavaScript.
 */

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  if (!hasSupabase) throw new Error('Supabase is not configured');
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by the middleware instead.
        }
      },
    },
  });
}

let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!hasSupabaseAdmin) return null;
  if (!serviceClient) {
    serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serviceClient;
}
