import 'server-only';
import { headers } from 'next/headers';
import { z } from 'zod';
import { AuthenticationError, AuthorizationError } from '@/server/auth/rbac';
import { NotFoundError } from '@/server/db/store';
import { RateLimitError, enforceRateLimit, type RateLimitName } from '@/lib/rate-limit';
import { fieldErrorsFrom, type ActionResult } from '@/server/validation/schemas';
import { visitorHash } from '@/server/db/repositories/analytics';

/**
 * Server action plumbing.
 *
 * `action()` wraps a handler so that every failure mode becomes a typed
 * `ActionResult` instead of an unhandled exception. Crucially, internal errors
 * are logged in full but returned to the user as a generic message — a database
 * error string must never reach the browser.
 */

export async function action<T>(handler: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await handler() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsFrom(error) };
    }
    if (error instanceof AuthenticationError) {
      return { ok: false, error: 'Sign in to continue.' };
    }
    if (error instanceof AuthorizationError) {
      return { ok: false, error: 'You do not have permission to do that.' };
    }
    if (error instanceof RateLimitError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof NotFoundError) {
      return { ok: false, error: 'That item no longer exists.' };
    }
    // Anything else is a bug or an infrastructure failure. Log it; do not leak it.
    console.error('[vitpulse] action failed:', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

/** Success result with a message the UI shows in a toast. */
export function ok<T>(data: T, message?: string): { ok: true; data: T; message?: string } {
  return message ? { ok: true, data, message } : { ok: true, data };
}

/**
 * A coarse, non-identifying request fingerprint.
 *
 * Used only as a rate-limit bucket and as the seed for the daily analytics
 * visitor hash. The raw value is never persisted.
 */
export async function requestFingerprint(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || h.get('x-real-ip') || 'local';
  const ua = h.get('user-agent')?.slice(0, 80) ?? '';
  return `${ip}|${ua}`;
}

export async function currentVisitorHash(): Promise<string> {
  return visitorHash(await requestFingerprint());
}

/** Applies a named rate limit keyed by user id, falling back to the request. */
export async function limit(name: RateLimitName, userId?: string | null): Promise<void> {
  const identity = userId ? `u:${userId}` : `a:${await requestFingerprint()}`;
  enforceRateLimit(name, identity);
}

/** Reads a FormData into a plain object, collecting repeated keys into arrays. */
export function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      out[key] = value;
      continue;
    }
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [existing, value];
    }
  }
  return out;
}

/**
 * Normalises HTML checkbox semantics before validation.
 * An unchecked box submits nothing, so absent keys must become `false` rather
 * than tripping a `required` error.
 */
export function withBooleans(raw: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out = { ...raw };
  for (const key of keys) {
    out[key] = raw[key] === 'on' || raw[key] === 'true' || raw[key] === true;
  }
  return out;
}

/** Normalises a repeated form field into a string array. */
export function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}
