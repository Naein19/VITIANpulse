/**
 * Fixed-window rate limiter.
 *
 * Backed by an in-process map, which is correct for a single Node instance and
 * adequate for per-isolate protection on Vercel at this product's volumes.
 * `RATE_LIMIT_REDIS_URL` is the documented upgrade path; a Redis implementation
 * only needs to satisfy `checkRateLimit`'s signature.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
  limit: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitRule {
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** Named rules keep limits consistent and reviewable in one place. */
export const RATE_LIMITS = {
  'auth:signin': { limit: 8, windowMs: 10 * 60_000 },
  'content:write': { limit: 30, windowMs: 60_000 },
  'community:post': { limit: 6, windowMs: 5 * 60_000 },
  'community:comment': { limit: 20, windowMs: 5 * 60_000 },
  'upload:pyq': { limit: 10, windowMs: 60 * 60_000 },
  'report:create': { limit: 10, windowMs: 60 * 60_000 },
  'search:query': { limit: 90, windowMs: 60_000 },
  'analytics:ingest': { limit: 240, windowMs: 60_000 },
  'ad:event': { limit: 300, windowMs: 60_000 },
  'lostfound:create': { limit: 5, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export function checkRateLimit(name: RateLimitName, identity: string, now = Date.now()): RateLimitResult {
  sweep(now);
  const rule = RATE_LIMITS[name];
  const key = `${name}:${identity}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: rule.limit - 1, resetAt, limit: rule.limit };
  }

  if (existing.count >= rule.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt, limit: rule.limit };
  }

  existing.count += 1;
  return { allowed: true, remaining: rule.limit - existing.count, resetAt: existing.resetAt, limit: rule.limit };
}

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMITED' as const;
  constructor(public readonly result: RateLimitResult) {
    const seconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    super(`Too many requests. Try again in ${seconds}s.`);
    this.name = 'RateLimitError';
  }
}

export function enforceRateLimit(name: RateLimitName, identity: string): void {
  const result = checkRateLimit(name, identity);
  if (!result.allowed) throw new RateLimitError(result);
}

/** Test-only: clears all buckets. */
export function __resetRateLimits(): void {
  buckets.clear();
  lastSweep = 0;
}
