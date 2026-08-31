import { z } from 'zod';

/**
 * Environment contract.
 *
 * Parsed once at module load. Anything missing degrades to a documented,
 * safe default rather than throwing at import time, because Next evaluates this
 * module during `next build` where secrets may legitimately be absent.
 */

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  /** Server-only. Never referenced from a file that ships to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  /** Base URL of the existing PYQ Hub deployment, used by the PYQ connector. */
  PYQ_HUB_BASE_URL: z.string().url().default('https://pyqs-hub.vercel.app'),
  PYQ_HUB_API_TOKEN: z.string().optional(),
  /** Rotating salt for the daily visitor hash. Rotate to reset unique counts. */
  ANALYTICS_SALT: z.string().min(8).default('vitpulse-dev-salt'),
  /** Comma-separated emails bootstrapped to SUPER_ADMIN on first sign-in. */
  SUPER_ADMIN_EMAILS: z.string().default(''),
  /** HMAC key for the demo-mode session cookie. Unused once Supabase is wired. */
  SESSION_SECRET: z.string().min(16).default('vitpulse-local-development-secret'),
  /** Email domain students must use to sign in. */
  ALLOWED_EMAIL_DOMAINS: z.string().default('vitapstudent.ac.in,vitap.ac.in'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === 'production') {
  console.error('[vitpulse] invalid environment:', parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : schema.parse({});

/** True when Supabase is fully configured for anonymous/browser use. */
export const hasSupabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** True when privileged server operations are possible. */
export const hasSupabaseAdmin = hasSupabase && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const superAdminEmails = new Set(
  env.SUPER_ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

export const allowedEmailDomains = env.ALLOWED_EMAIL_DOMAINS.split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/** Whether an email is allowed to create an account. */
export function isAllowedEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return false;
  return allowedEmailDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}
