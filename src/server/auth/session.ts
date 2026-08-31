import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { env, hasSupabase, superAdminEmails } from '@/lib/env';
import { getStore } from '@/server/db';
import type { Profile, Role } from '@/types/domain';
import { AuthenticationError, AuthorizationError, can, type Permission } from './rbac';
import { getSupabaseServerClient } from '@/server/supabase/clients';

/**
 * Session resolution.
 *
 * With Supabase configured, identity comes from the verified auth cookie and the
 * profile row is read under RLS. Without it, a signed demo cookie names one of
 * the seeded accounts so every role-dependent path stays exercisable locally.
 *
 * In both cases the *role* is read from the database, never from the client.
 */

export const DEMO_SESSION_COOKIE = 'vitpulse_demo_session';

export interface SessionUser extends Profile {
  /** Clubs this user administers. Drives ownership checks in server actions. */
  adminClubIds: string[];
  /** Clubs this user is any kind of member of. */
  memberClubIds: string[];
}

/* ----------------------------------------------------- demo cookie signing */

function sign(value: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(value).digest('base64url');
}

export function encodeDemoSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function decodeDemoSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const index = raw.lastIndexOf('.');
  if (index <= 0) return null;
  const userId = raw.slice(0, index);
  const provided = raw.slice(index + 1);
  const expected = sign(userId);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

/* ------------------------------------------------------------- resolution */

async function resolveUserId(): Promise<string | null> {
  if (hasSupabase) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }
  const store = await cookies();
  return decodeDemoSession(store.get(DEMO_SESSION_COOKIE)?.value);
}

/**
 * The signed-in user, or null. Memoised per request by React's `cache`, so a
 * page that checks permissions in five components still issues one query.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await resolveUserId();
  if (!userId) return null;

  const store = await getStore();
  const profile = await store.selectOne<Profile & { id: string }>({
    table: 'profiles',
    filters: [{ op: 'eq', col: 'id', value: userId }],
  });
  if (!profile) return null;

  // A suspended account keeps its session but loses every permission.
  const effectiveRole: Role = profile.suspended ? 'STUDENT' : profile.role;

  const { rows: memberships } = await store.select<{ id: string; clubId: string; clubRole: string }>({
    table: 'club_members',
    filters: [{ op: 'eq', col: 'userId', value: userId }],
  });

  return {
    ...profile,
    role: effectiveRole,
    adminClubIds: memberships.filter((m) => m.clubRole === 'ADMIN').map((m) => m.clubId),
    memberClubIds: memberships.map((m) => m.clubId),
  };
});

/** Convenience for UI that only needs the role. */
export async function getSessionRole(): Promise<Role | null> {
  const user = await getSessionUser();
  return user?.role ?? null;
}

/* --------------------------------------------------------------- guards */

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthenticationError();
  if (user.suspended) {
    throw new AuthorizationError('account:active');
  }
  return user;
}

/**
 * The single gate every privileged server action goes through.
 * Throws rather than returning a boolean so a forgotten `if` cannot open a hole.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new AuthorizationError(permission);
  return user;
}

/** Ownership-aware variant for club-scoped writes. */
export async function requireClubPermission(
  clubId: string,
  ownPermission: Permission,
  anyPermission: Permission,
): Promise<SessionUser> {
  const user = await requireUser();
  if (can(user.role, anyPermission)) return user;
  if (can(user.role, ownPermission) && user.adminClubIds.includes(clubId)) return user;
  throw new AuthorizationError(anyPermission);
}

/* ------------------------------------------------------ bootstrap helpers */

/**
 * Role assigned to a brand-new account.
 * Only addresses listed in SUPER_ADMIN_EMAILS are elevated, which is how the
 * very first administrator is created without a manual database edit.
 */
export function initialRoleFor(email: string): Role {
  return superAdminEmails.has(email.trim().toLowerCase()) ? 'SUPER_ADMIN' : 'STUDENT';
}

/** A stable per-user identity for rate limiting; falls back to a request hint. */
export function rateLimitIdentity(user: SessionUser | null, fallback: string): string {
  return user ? `u:${user.id}` : `a:${fallback}`;
}
