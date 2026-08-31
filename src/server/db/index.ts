import 'server-only';
import { MemoryStore } from './memory-store';
import { SupabaseStore } from './supabase-store';
import type { Store } from './store';
import { buildSeed } from '@/seed';
import { hasSupabase, isProduction, isTest } from '@/lib/env';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/server/supabase/clients';

/**
 * Store resolution.
 *
 * - Supabase configured  -> `SupabaseStore` over the request's RLS-scoped client.
 * - Otherwise            -> the seeded `MemoryStore` (development / test only).
 *
 * Production without Supabase is a configuration error and is reported loudly
 * rather than silently serving demo data to real users.
 */

let memoryStore: MemoryStore | null = null;

function getMemoryStore(): MemoryStore {
  if (!memoryStore) {
    memoryStore = new MemoryStore(buildSeed(), { persist: !isTest });
  }
  return memoryStore;
}

export function isDemoMode(): boolean {
  return !hasSupabase;
}

if (isProduction && !hasSupabase) {
  console.error(
    '[vitpulse] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. ' +
      'The app is running on demo data — set them before serving real users.',
  );
}

/** The request-scoped store. Reads and writes pass through RLS when on Supabase. */
export async function getStore(): Promise<Store> {
  if (!hasSupabase) return getMemoryStore();
  const client = await getSupabaseServerClient();
  return new SupabaseStore(client);
}

/**
 * A store that bypasses RLS.
 *
 * ONLY for operations that have already passed an explicit `requirePermission`
 * check on the server, or for writes a user cannot be expected to own (e.g.
 * inserting a notification addressed to somebody else). Never reachable from
 * client code — this module is `server-only`.
 */
export async function getPrivilegedStore(): Promise<Store> {
  if (!hasSupabase) return getMemoryStore();
  const client = getSupabaseServiceClient();
  if (!client) {
    // Without a service-role key, fall back to the RLS-scoped client. Policies
    // then decide, which fails closed rather than open.
    return new SupabaseStore(await getSupabaseServerClient());
  }
  return new SupabaseStore(client);
}

/** Test helper: resets the in-memory dataset to a fresh seed. */
export function __resetMemoryStore(now?: Date): void {
  memoryStore = new MemoryStore(buildSeed(now), { persist: false });
}

export { MemoryStore } from './memory-store';
export * from './store';
