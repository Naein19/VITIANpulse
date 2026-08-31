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

/**
 * The in-memory store is pinned to `globalThis`.
 *
 * A plain module-level `let` is not enough: Next re-evaluates modules across
 * HMR boundaries and route segments in development, which yields more than one
 * instance — a write from a server action then lands in a different store than
 * the one a page reads from, and the mutation appears to vanish. Anchoring to
 * the global object guarantees exactly one store per process.
 */
const MEMORY_STORE_KEY = Symbol.for('vitpulse.memoryStore');

type GlobalWithStore = typeof globalThis & { [MEMORY_STORE_KEY]?: MemoryStore };

function getMemoryStore(): MemoryStore {
  const globalRef = globalThis as GlobalWithStore;
  if (!globalRef[MEMORY_STORE_KEY]) {
    globalRef[MEMORY_STORE_KEY] = new MemoryStore(buildSeed(), { persist: !isTest });
  }
  return globalRef[MEMORY_STORE_KEY];
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
  (globalThis as GlobalWithStore)[MEMORY_STORE_KEY] = new MemoryStore(buildSeed(now), { persist: false });
}

export { MemoryStore } from './memory-store';
export * from './store';
