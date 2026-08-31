import { beforeEach, describe, expect, it } from 'vitest';
import { RATE_LIMITS, __resetRateLimits, checkRateLimit, enforceRateLimit, RateLimitError } from './rate-limit';

describe('rate limiting', () => {
  beforeEach(() => __resetRateLimits());

  it('allows requests up to the limit, then blocks', () => {
    const { limit } = RATE_LIMITS['community:post'];

    for (let i = 0; i < limit; i += 1) {
      expect(checkRateLimit('community:post', 'user-1').allowed).toBe(true);
    }
    expect(checkRateLimit('community:post', 'user-1').allowed).toBe(false);
  });

  it('reports remaining budget accurately', () => {
    const { limit } = RATE_LIMITS['community:post'];
    expect(checkRateLimit('community:post', 'u').remaining).toBe(limit - 1);
    expect(checkRateLimit('community:post', 'u').remaining).toBe(limit - 2);
  });

  it('keeps identities isolated — one user cannot exhaust another', () => {
    const { limit } = RATE_LIMITS['community:post'];
    for (let i = 0; i < limit; i += 1) checkRateLimit('community:post', 'noisy');

    expect(checkRateLimit('community:post', 'noisy').allowed).toBe(false);
    expect(checkRateLimit('community:post', 'quiet').allowed).toBe(true);
  });

  it('keeps buckets isolated per rule', () => {
    const { limit } = RATE_LIMITS['community:post'];
    for (let i = 0; i < limit; i += 1) checkRateLimit('community:post', 'u');

    expect(checkRateLimit('community:post', 'u').allowed).toBe(false);
    // A different action for the same user is unaffected.
    expect(checkRateLimit('search:query', 'u').allowed).toBe(true);
  });

  it('resets once the window has elapsed', () => {
    const rule = RATE_LIMITS['community:post'];
    const start = Date.now();

    for (let i = 0; i < rule.limit; i += 1) checkRateLimit('community:post', 'u', start);
    expect(checkRateLimit('community:post', 'u', start).allowed).toBe(false);

    const afterWindow = start + rule.windowMs + 1;
    expect(checkRateLimit('community:post', 'u', afterWindow).allowed).toBe(true);
  });

  it('throws a typed error carrying the reset time', () => {
    const { limit } = RATE_LIMITS['report:create'];
    for (let i = 0; i < limit; i += 1) enforceRateLimit('report:create', 'u');

    try {
      enforceRateLimit('report:create', 'u');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).code).toBe('RATE_LIMITED');
      expect((error as RateLimitError).result.resetAt).toBeGreaterThan(Date.now());
    }
  });

  it('sets tighter limits on the abuse-prone actions', () => {
    // Posting a thread must be harder than running a search.
    expect(RATE_LIMITS['community:post'].limit).toBeLessThan(RATE_LIMITS['search:query'].limit);
    expect(RATE_LIMITS['lostfound:create'].limit).toBeLessThan(RATE_LIMITS['content:write'].limit);
    expect(RATE_LIMITS['auth:signin'].limit).toBeLessThanOrEqual(10);
  });
});
