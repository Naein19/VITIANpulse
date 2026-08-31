import { describe, expect, it } from 'vitest';
import {
  deadlineProximity, explainPostScore, freshness, makeContext, popularity, rankBy, scoreEvent, scorePost,
} from './ranking';
import type { EventWithRelations, PostWithRelations } from '@/types/domain';

const NOW = Date.parse('2026-08-31T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const hoursAhead = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

function post(overrides: Partial<PostWithRelations> = {}): PostWithRelations {
  return {
    id: 'p1', slug: 'p1', title: 'T', summary: 'S', body: 'B',
    category: 'CAMPUS', importance: 'NORMAL', status: 'PUBLISHED',
    coverImageUrl: null, coverImageAlt: null, source: 'Desk', location: null, eventDate: null,
    tags: [], authorId: 'a', clubId: null,
    viewCount: 0, reactionCount: 0, commentCount: 0, pinned: false,
    publishedAt: hoursAgo(1), expiresAt: null,
    createdAt: hoursAgo(1), updatedAt: hoursAgo(1),
    author: null, club: null,
    ...overrides,
  };
}

function event(overrides: Partial<EventWithRelations> = {}): EventWithRelations {
  return {
    id: 'e1', slug: 'e1', title: 'T', summary: 'S', description: 'D',
    category: 'WORKSHOP', status: 'PUBLISHED', posterUrl: null, posterAlt: null,
    clubId: null, organiser: 'Org', school: null, venue: 'V', locationId: null,
    startsAt: hoursAhead(10), endsAt: hoursAhead(12),
    registrationRequired: false, registrationUrl: null, registrationDeadline: null,
    seats: null, seatsTaken: 0, isPaid: false, feeInr: 0, tags: [], contactEmail: null,
    createdBy: 'a', viewCount: 0, featured: false,
    publishedAt: hoursAgo(24), createdAt: hoursAgo(24), updatedAt: hoursAgo(24),
    club: null, location: null,
    ...overrides,
  };
}

describe('scoring terms', () => {
  it('decays freshness on a half-life', () => {
    expect(freshness(hoursAgo(0), NOW, 30, 40)).toBeCloseTo(40, 1);
    expect(freshness(hoursAgo(30), NOW, 30, 40)).toBeCloseTo(20, 1);
    expect(freshness(hoursAgo(60), NOW, 30, 40)).toBeCloseTo(10, 1);
    expect(freshness(null, NOW)).toBe(0);
  });

  it('raises deadline urgency as the date nears and drops it once passed', () => {
    expect(deadlineProximity(hoursAhead(6), NOW)).toBeGreaterThan(deadlineProximity(hoursAhead(100), NOW));
    expect(deadlineProximity(hoursAgo(1), NOW)).toBe(0);
    expect(deadlineProximity(null, NOW)).toBe(0);
  });

  it('gives popularity diminishing returns', () => {
    expect(popularity(100)).toBeGreaterThan(popularity(10));
    // A viral item cannot run away with the feed.
    expect(popularity(1_000_000)).toBeLessThanOrEqual(16);
  });
});

describe('post ranking', () => {
  const ctx = makeContext({ now: NOW });

  it('ranks urgent above important above normal, all else equal', () => {
    const normal = scorePost(post({ importance: 'NORMAL' }), ctx);
    const important = scorePost(post({ importance: 'IMPORTANT' }), ctx);
    const urgent = scorePost(post({ importance: 'URGENT' }), ctx);

    expect(urgent).toBeGreaterThan(important);
    expect(important).toBeGreaterThan(normal);
  });

  it('lifts posts from a followed club', () => {
    const followed = makeContext({ now: NOW, followedClubIds: new Set(['c1']) });
    expect(scorePost(post({ clubId: 'c1' }), followed)).toBeGreaterThan(scorePost(post({ clubId: 'c1' }), ctx));
  });

  it('lifts posts matching declared interests', () => {
    const interested = makeContext({ now: NOW, interests: new Set(['hackathon']) });
    expect(scorePost(post({ tags: ['hackathon'] }), interested))
      .toBeGreaterThan(scorePost(post({ tags: ['hackathon'] }), ctx));
  });

  it('pushes expired posts down hard', () => {
    expect(scorePost(post({ expiresAt: hoursAgo(1) }), ctx)).toBeLessThan(scorePost(post(), ctx));
  });

  it('is explainable — the terms sum to the total', () => {
    const breakdown = explainPostScore(post({ importance: 'IMPORTANT', pinned: true, viewCount: 500 }), ctx);
    const sum = breakdown.terms.reduce((acc, term) => acc + term.value, 0);

    expect(breakdown.total).toBeCloseTo(sum, 2);
    expect(breakdown.terms.map((t) => t.label)).toContain('Importance');
    expect(breakdown.terms.map((t) => t.label)).toContain('Pinned');
  });

  it('is deterministic — the same inputs give the same score', () => {
    const p = post({ importance: 'URGENT', viewCount: 1234, tags: ['ai'] });
    expect(scorePost(p, ctx)).toBe(scorePost(p, ctx));
  });
});

describe('event ranking', () => {
  const ctx = makeContext({ now: NOW });

  it('prefers sooner events and buries finished ones', () => {
    const today = scoreEvent(event({ startsAt: hoursAhead(3), endsAt: hoursAhead(5) }), ctx);
    const nextWeek = scoreEvent(event({ startsAt: hoursAhead(200), endsAt: hoursAhead(202) }), ctx);
    const finished = scoreEvent(event({ startsAt: hoursAgo(10), endsAt: hoursAgo(8) }), ctx);

    expect(today).toBeGreaterThan(nextWeek);
    expect(finished).toBeLessThan(nextWeek);
  });

  it('penalises a full event', () => {
    const open = scoreEvent(event({ seats: 100, seatsTaken: 10 }), ctx);
    const full = scoreEvent(event({ seats: 100, seatsTaken: 100 }), ctx);
    expect(full).toBeLessThan(open);
  });
});

describe('rankBy', () => {
  it('sorts by score, then tiebreaker, then id', () => {
    const items = [
      { id: 'b', score: 1, tie: 1 },
      { id: 'a', score: 1, tie: 1 },
      { id: 'c', score: 2, tie: 0 },
    ];
    const ranked = rankBy(items, (i) => i.score, (i) => i.tie);
    expect(ranked.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});
