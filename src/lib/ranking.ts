import type { Importance, PostWithRelations, EventWithRelations, Opportunity } from '@/types/domain';

/**
 * Deterministic content ranking.
 *
 * Every contribution to a score is a named, bounded term and the total is
 * explainable — `explainPostScore` returns the exact breakdown, which is what
 * the admin console shows. No model, no randomness, no hidden weights. The
 * shape leaves room for an AI re-ranker later: it would consume these signals
 * rather than replace them.
 */

export interface RankingContext {
  now: number;
  /** Clubs the viewer follows. */
  followedClubIds: ReadonlySet<string>;
  /** The viewer's declared interests, lower-cased. */
  interests: ReadonlySet<string>;
  branch: string | null;
  year: number | null;
}

export const EMPTY_CONTEXT: RankingContext = {
  now: 0,
  followedClubIds: new Set(),
  interests: new Set(),
  branch: null,
  year: null,
};

export function makeContext(partial: Partial<RankingContext> = {}): RankingContext {
  return { ...EMPTY_CONTEXT, now: partial.now ?? Date.now(), ...partial };
}

export interface ScoreTerm {
  label: string;
  value: number;
}

export interface ScoreBreakdown {
  total: number;
  terms: ScoreTerm[];
}

const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  NORMAL: 0,
  IMPORTANT: 18,
  URGENT: 34,
};

/**
 * Freshness on a half-life curve: full marks at publication, half after
 * `halfLifeHours`, asymptotically zero. Bounded to [0, max].
 */
export function freshness(publishedAt: string | null, now: number, halfLifeHours = 30, max = 40): number {
  if (!publishedAt) return 0;
  const ageHours = (now - Date.parse(publishedAt)) / 3_600_000;
  if (!Number.isFinite(ageHours)) return 0;
  if (ageHours < 0) return max; // scheduled slightly ahead — treat as brand new
  return round(max * Math.pow(0.5, ageHours / halfLifeHours));
}

/**
 * Urgency from an approaching deadline: rises as the deadline nears, drops to
 * zero once it has passed.
 */
export function deadlineProximity(deadline: string | null, now: number, max = 30): number {
  if (!deadline) return 0;
  const hoursLeft = (Date.parse(deadline) - now) / 3_600_000;
  if (!Number.isFinite(hoursLeft) || hoursLeft <= 0) return 0;
  if (hoursLeft <= 24) return max;
  if (hoursLeft <= 72) return round(max * 0.75);
  if (hoursLeft <= 168) return round(max * 0.5);
  if (hoursLeft <= 336) return round(max * 0.25);
  return round(max * 0.1);
}

/** Diminishing-returns popularity so a single viral item cannot dominate. */
export function popularity(views: number, max = 16): number {
  if (views <= 0) return 0;
  return round(Math.min(max, Math.log10(views + 1) * (max / 4)));
}

function overlap(tags: readonly string[], interests: ReadonlySet<string>): number {
  if (interests.size === 0) return 0;
  let hits = 0;
  for (const tag of tags) if (interests.has(tag.toLowerCase())) hits += 1;
  return hits;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function explainPostScore(post: PostWithRelations, ctx: RankingContext): ScoreBreakdown {
  const terms: ScoreTerm[] = [
    { label: 'Freshness', value: freshness(post.publishedAt, ctx.now) },
    { label: 'Importance', value: IMPORTANCE_WEIGHT[post.importance] },
    { label: 'Popularity', value: popularity(post.viewCount) },
  ];
  if (post.pinned) terms.push({ label: 'Pinned', value: 25 });
  if (post.clubId && ctx.followedClubIds.has(post.clubId)) {
    terms.push({ label: 'Followed club', value: 22 });
  }
  const interestHits = overlap(post.tags, ctx.interests);
  if (interestHits > 0) terms.push({ label: 'Matching interests', value: round(Math.min(15, interestHits * 7)) });
  if (post.expiresAt && Date.parse(post.expiresAt) < ctx.now) {
    terms.push({ label: 'Expired', value: -60 });
  }
  const total = round(terms.reduce((sum, t) => sum + t.value, 0));
  return { total, terms };
}

export function scorePost(post: PostWithRelations, ctx: RankingContext): number {
  return explainPostScore(post, ctx).total;
}

export function explainEventScore(event: EventWithRelations, ctx: RankingContext): ScoreBreakdown {
  const startsIn = (Date.parse(event.startsAt) - ctx.now) / 3_600_000;
  const terms: ScoreTerm[] = [{ label: 'Popularity', value: popularity(event.viewCount) }];

  if (startsIn < -2) {
    terms.push({ label: 'Already finished', value: -80 });
  } else if (startsIn <= 24) {
    terms.push({ label: 'Happening today', value: 40 });
  } else if (startsIn <= 72) {
    terms.push({ label: 'Within three days', value: 28 });
  } else if (startsIn <= 168) {
    terms.push({ label: 'This week', value: 18 });
  } else {
    terms.push({ label: 'Upcoming', value: 6 });
  }

  if (event.featured) terms.push({ label: 'Featured', value: 14 });
  if (event.clubId && ctx.followedClubIds.has(event.clubId)) {
    terms.push({ label: 'Followed club', value: 24 });
  }
  if (event.school && ctx.branch && event.school === branchToSchool(ctx.branch)) {
    terms.push({ label: 'Your school', value: 10 });
  }
  const interestHits = overlap(event.tags, ctx.interests);
  if (interestHits > 0) terms.push({ label: 'Matching interests', value: round(Math.min(15, interestHits * 7)) });
  if (event.registrationDeadline) {
    terms.push({ label: 'Registration closing', value: deadlineProximity(event.registrationDeadline, ctx.now, 12) });
  }
  if (event.seats !== null && event.seatsTaken >= event.seats) {
    terms.push({ label: 'Full', value: -12 });
  }

  const total = round(terms.reduce((sum, t) => sum + t.value, 0));
  return { total, terms };
}

export function scoreEvent(event: EventWithRelations, ctx: RankingContext): number {
  return explainEventScore(event, ctx).total;
}

export function explainOpportunityScore(opp: Opportunity, ctx: RankingContext): ScoreBreakdown {
  const terms: ScoreTerm[] = [
    { label: 'Deadline proximity', value: deadlineProximity(opp.deadline, ctx.now) },
    { label: 'Freshness', value: freshness(opp.publishedAt, ctx.now, 96, 18) },
    { label: 'Popularity', value: popularity(opp.viewCount, 12) },
  ];
  if (Date.parse(opp.deadline) < ctx.now) terms.push({ label: 'Closed', value: -100 });
  if (ctx.branch && opp.branches.length > 0) {
    terms.push({
      label: opp.branches.includes(ctx.branch as never) ? 'Matches your branch' : 'Other branches',
      value: opp.branches.includes(ctx.branch as never) ? 20 : -14,
    });
  }
  if (ctx.year !== null && opp.years.length > 0) {
    terms.push({
      label: opp.years.includes(ctx.year) ? 'Matches your year' : 'Other years',
      value: opp.years.includes(ctx.year) ? 14 : -10,
    });
  }
  const interestHits = overlap(opp.tags, ctx.interests);
  if (interestHits > 0) terms.push({ label: 'Matching interests', value: round(Math.min(12, interestHits * 6)) });

  const total = round(terms.reduce((sum, t) => sum + t.value, 0));
  return { total, terms };
}

export function scoreOpportunity(opp: Opportunity, ctx: RankingContext): number {
  return explainOpportunityScore(opp, ctx).total;
}

/**
 * Maps a programme to the school that runs it, using VIT-AP's real structure.
 * Used only as a soft ranking signal, so an unmapped programme is fine.
 */
export function branchToSchool(branch: string): string | null {
  if (branch.startsWith('CSE') || branch === 'CSBS' || branch === 'MTECH') return 'SCOPE';
  if (branch.startsWith('ECE') || branch === 'EEE' || branch === 'ECM') return 'SENSE';
  if (branch.startsWith('MECH')) return 'SMEC';
  if (branch === 'BIOTECH') return 'SBST';
  if (branch === 'BSC-STATS') return 'SAS';
  if (branch === 'BSC-PSYCH') return 'VISH';
  if (branch === 'BBA' || branch === 'BCOM' || branch === 'MBA') return 'VSB';
  if (branch === 'LAW') return 'VSL';
  return null;
}

/** Stable sort by score descending, then by a tiebreaker, then by id. */
export function rankBy<T extends { id: string }>(
  items: readonly T[],
  score: (item: T) => number,
  tiebreak: (item: T) => number = () => 0,
): T[] {
  return items
    .map((item) => ({ item, score: score(item), tie: tiebreak(item) }))
    .sort((a, b) => b.score - a.score || b.tie - a.tie || a.item.id.localeCompare(b.item.id))
    .map((entry) => entry.item);
}
