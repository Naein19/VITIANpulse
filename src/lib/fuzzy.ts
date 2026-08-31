/**
 * Fuzzy matching for global search and the command palette.
 *
 * A small subsequence matcher rather than a dependency: it scores exact
 * substring hits highest, then word-prefix hits, then scattered subsequence
 * matches, and rewards consecutive runs and word-boundary starts. Deterministic
 * and fast enough to run over a few thousand candidates per keystroke.
 */

export interface FuzzyResult {
  score: number;
  /** Indices of matched characters, for highlighting. */
  matches: number[];
}

const MISS = { score: 0, matches: [] as number[] } as const;

export function fuzzyScore(query: string, target: string): FuzzyResult {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, matches: [] };
  const t = target.toLowerCase();
  if (q.length > t.length) return { ...MISS };

  // Exact substring: strongest signal, bonus when it starts a word.
  const direct = t.indexOf(q);
  if (direct !== -1) {
    const atStart = direct === 0;
    const atWordBoundary = atStart || /[\s\-_/.]/.test(t[direct - 1] ?? '');
    const coverage = q.length / t.length;
    const score = 120 + (atStart ? 40 : atWordBoundary ? 25 : 0) + Math.round(coverage * 40);
    return { score, matches: Array.from({ length: q.length }, (_, i) => direct + i) };
  }

  // Initials: "cn" matches "Computer Networks".
  const initials = t
    .split(/[\s\-_/.]+/)
    .map((w) => w[0] ?? '')
    .join('');
  if (initials.startsWith(q)) {
    return { score: 100, matches: [] };
  }

  // Subsequence with run and boundary bonuses.
  const matches: number[] = [];
  let ti = 0;
  let score = 0;
  let run = 0;
  for (const ch of q) {
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti;
        break;
      }
      ti += 1;
    }
    if (found === -1) return { ...MISS };
    matches.push(found);
    const prev = t[found - 1];
    const boundary = found === 0 || (prev !== undefined && /[\s\-_/.]/.test(prev));
    run = matches.length >= 2 && matches[matches.length - 2] === found - 1 ? run + 1 : 0;
    score += 6 + (boundary ? 8 : 0) + run * 4;
    ti = found + 1;
  }
  // Penalise matches spread across a long string.
  const span = (matches[matches.length - 1] ?? 0) - (matches[0] ?? 0) + 1;
  score -= Math.min(20, Math.floor(span / 6));
  return { score: Math.max(1, score), matches };
}

export interface SearchableField {
  value: string;
  /** Multiplier applied to this field's score. */
  weight: number;
}

/** Scores a record across several weighted fields, taking the best field hit. */
export function scoreFields(query: string, fields: readonly SearchableField[]): number {
  let best = 0;
  for (const field of fields) {
    if (!field.value) continue;
    const { score } = fuzzyScore(query, field.value);
    if (score > 0) best = Math.max(best, score * field.weight);
  }
  return Math.round(best);
}

/** Splits a highlighted string into matched/unmatched runs for rendering. */
export function highlightSegments(text: string, matches: readonly number[]): Array<{ text: string; hit: boolean }> {
  if (matches.length === 0) return [{ text, hit: false }];
  const set = new Set(matches);
  const out: Array<{ text: string; hit: boolean }> = [];
  let buffer = '';
  let current = set.has(0);
  for (let i = 0; i < text.length; i += 1) {
    const hit = set.has(i);
    if (hit !== current && buffer) {
      out.push({ text: buffer, hit: current });
      buffer = '';
    }
    current = hit;
    buffer += text[i];
  }
  if (buffer) out.push({ text: buffer, hit: current });
  return out;
}
