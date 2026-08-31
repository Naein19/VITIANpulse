'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { hasSupabase, isAllowedEmail, siteUrl } from '@/lib/env';
import { getStore, getPrivilegedStore } from '@/server/db';
import { DEMO_SESSION_COOKIE, encodeDemoSession, getSessionUser, requireUser } from '@/server/auth/session';
import { getSupabaseServerClient } from '@/server/supabase/clients';
import { onboardingSchema, profileUpdateSchema, notificationPrefsSchema, type ActionResult } from '@/server/validation/schemas';
import { action, formToObject, limit, ok, asArray } from './_shared';
import { safeInternalPath } from '@/lib/sanitize';
import { audit } from '@/server/db/repositories/admin';
import type { Profile } from '@/types/domain';

/**
 * Authentication.
 *
 * With Supabase configured this issues a magic-link OTP restricted to campus
 * email domains. Without it, `signInAsDemoUser` sets a signed cookie naming one
 * of the seeded accounts — clearly labelled in the UI and refused in production.
 */

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function signInWithEmail(_prev: unknown, formData: FormData): Promise<ActionResult<{ sent: boolean }>> {
  return action(async () => {
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    await limit('auth:signin');

    if (!isAllowedEmail(email)) {
      throw Object.assign(new Error('Use your university email address.'), { name: 'ValidationError' });
    }
    if (!hasSupabase) {
      throw new Error('Email sign-in needs Supabase. Use a demo account below for local development.');
    }

    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) throw new Error(error.message);

    return ok({ sent: true }, 'Check your inbox for the sign-in link.').data;
  });
}

/** Demo-only sign-in. Refuses to run once Supabase is configured. */
export async function signInAsDemoUser(userId: string, next?: string): Promise<ActionResult<{ userId: string }>> {
  const result = await action(async () => {
    if (hasSupabase) throw new Error('Demo sign-in is disabled once Supabase is configured.');
    await limit('auth:signin');

    const store = await getStore();
    const profile = await store.selectOne<Profile>({
      table: 'profiles',
      filters: [{ op: 'eq', col: 'id', value: userId }],
    });
    if (!profile) throw new Error('That demo account does not exist.');

    const jar = await cookies();
    jar.set(DEMO_SESSION_COOKIE, encodeDemoSession(profile.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return { userId: profile.id };
  });

  if (result.ok) {
    const destination = next ? (safeInternalPath(next) ?? '/dashboard') : '/dashboard';
    redirect(destination);
  }
  return result;
}

export async function signOut(): Promise<void> {
  if (hasSupabase) {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function completeOnboarding(_prev: unknown, formData: FormData): Promise<ActionResult<{ done: true }>> {
  return action(async () => {
    const user = await requireUser();
    const raw = formToObject(formData);
    const input = onboardingSchema.parse({ ...raw, interests: asArray(raw.interests) });

    const store = await getStore();
    await store.update<Profile>('profiles', user.id, {
      displayName: input.displayName,
      branch: input.branch,
      school: input.school,
      year: input.year,
      semester: input.semester,
      interests: input.interests,
      onboardedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    revalidatePath('/', 'layout');
    return { done: true as const };
  });
}

export async function updateProfile(_prev: unknown, formData: FormData): Promise<ActionResult<{ done: true }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('content:write', user.id);
    const raw = formToObject(formData);
    const input = profileUpdateSchema.parse({ ...raw, interests: asArray(raw.interests) });

    const store = await getStore();
    await store.update<Profile>('profiles', user.id, {
      displayName: input.displayName,
      bio: input.bio,
      branch: input.branch,
      school: input.school,
      year: input.year,
      semester: input.semester,
      interests: input.interests,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath('/profile');
    revalidatePath('/dashboard');
    return { done: true as const };
  });
}

export async function updateNotificationPreferences(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ done: true }>> {
  return action(async () => {
    const user = await requireUser();
    const raw = formToObject(formData);
    const prefs = notificationPrefsSchema.parse(
      Object.fromEntries(
        Object.keys(notificationPrefsSchema.shape).map((key) => [key, raw[key] === 'on' || raw[key] === 'true']),
      ),
    );

    // Preferences are per (user, type) rows so a new notification type defaults
    // to enabled rather than silently inheriting a stale blob.
    const store = await getPrivilegedStore();
    await store.deleteWhere('notification_prefs', [{ op: 'eq', col: 'userId', value: user.id }]);
    await store.insertMany(
      'notification_prefs',
      Object.entries(prefs).map(([type, enabled]) => ({
        userId: user.id,
        type,
        enabled: Boolean(enabled),
        updatedAt: new Date().toISOString(),
      })),
    );

    revalidatePath('/notifications');
    return { done: true as const };
  });
}

/** Ensures a profile row exists for a freshly authenticated Supabase user. */
export async function ensureProfile(): Promise<void> {
  const user = await getSessionUser();
  if (user) return;
  if (!hasSupabase) return;

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser?.email) return;

  const store = await getPrivilegedStore();
  const existing = await store.selectOne<Profile>({
    table: 'profiles',
    filters: [{ op: 'eq', col: 'id', value: authUser.id }],
  });
  if (existing) return;

  const { initialRoleFor } = await import('@/server/auth/session');
  const username = authUser.email.split('@')[0]!.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24);
  const now = new Date().toISOString();

  await store.insert<Profile>('profiles', {
    id: authUser.id,
    email: authUser.email,
    displayName: authUser.user_metadata?.full_name ?? username,
    username,
    avatarUrl: null,
    bio: null,
    role: initialRoleFor(authUser.email),
    branch: null,
    school: null,
    year: null,
    semester: null,
    registrationNumber: null,
    interests: [],
    suspended: false,
    suspendedReason: null,
    onboardedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await audit({
    actorId: authUser.id,
    actorName: username,
    action: 'PROFILE_CREATED',
    entityType: 'profile',
    entityId: authUser.id,
  });
}
