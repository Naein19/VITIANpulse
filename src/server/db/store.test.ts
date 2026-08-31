import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from './memory-store';
import { compareRows, matchesAll, matchesFilter, toCamel, toSnake, rowToCamel } from './store';
import type { Row } from './store';

/**
 * The store port is the seam every repository sits on, so its filter semantics
 * need to be exact — a subtly wrong `overlaps` or `ilike` would silently change
 * what students can see.
 */

describe('filter evaluation', () => {
  const row: Row = {
    id: '1',
    title: 'Machine Learning Club',
    status: 'PUBLISHED',
    views: 42,
    tags: ['ai', 'ml'],
    clubId: null,
  };

  it('compares equality and inequality', () => {
    expect(matchesFilter(row, { op: 'eq', col: 'status', value: 'PUBLISHED' })).toBe(true);
    expect(matchesFilter(row, { op: 'eq', col: 'status', value: 'DRAFT' })).toBe(false);
    expect(matchesFilter(row, { op: 'neq', col: 'status', value: 'DRAFT' })).toBe(true);
  });

  it('compares ordered values', () => {
    expect(matchesFilter(row, { op: 'gt', col: 'views', value: 40 })).toBe(true);
    expect(matchesFilter(row, { op: 'gte', col: 'views', value: 42 })).toBe(true);
    expect(matchesFilter(row, { op: 'lt', col: 'views', value: 42 })).toBe(false);
    expect(matchesFilter(row, { op: 'lte', col: 'views', value: 42 })).toBe(true);
  });

  it('matches ilike case-insensitively on substrings', () => {
    expect(matchesFilter(row, { op: 'ilike', col: 'title', value: 'machine' })).toBe(true);
    expect(matchesFilter(row, { op: 'ilike', col: 'title', value: 'LEARNING' })).toBe(true);
    expect(matchesFilter(row, { op: 'ilike', col: 'title', value: 'physics' })).toBe(false);
  });

  it('distinguishes contains (all) from overlaps (any)', () => {
    expect(matchesFilter(row, { op: 'contains', col: 'tags', values: ['ai', 'ml'] })).toBe(true);
    expect(matchesFilter(row, { op: 'contains', col: 'tags', values: ['ai', 'robotics'] })).toBe(false);
    expect(matchesFilter(row, { op: 'overlaps', col: 'tags', values: ['ai', 'robotics'] })).toBe(true);
    expect(matchesFilter(row, { op: 'overlaps', col: 'tags', values: ['robotics'] })).toBe(false);
  });

  it('treats `is null` as covering both null and absent', () => {
    expect(matchesFilter(row, { op: 'is', col: 'clubId', value: null })).toBe(true);
    expect(matchesFilter(row, { op: 'is', col: 'missing', value: null })).toBe(true);
    expect(matchesFilter(row, { op: 'is', col: 'status', value: null })).toBe(false);
  });

  it('treats `or` as a disjunction', () => {
    expect(
      matchesFilter(row, {
        op: 'or',
        filters: [
          { op: 'eq', col: 'status', value: 'DRAFT' },
          { op: 'ilike', col: 'title', value: 'machine' },
        ],
      }),
    ).toBe(true);
  });

  it('requires every filter in a list', () => {
    expect(
      matchesAll(row, [
        { op: 'eq', col: 'status', value: 'PUBLISHED' },
        { op: 'gt', col: 'views', value: 100 },
      ]),
    ).toBe(false);
  });
});

describe('ordering', () => {
  it('sorts ascending and descending', () => {
    const a = { id: 'a', n: 1 };
    const b = { id: 'b', n: 2 };
    expect(compareRows(a, b, [{ col: 'n' }])).toBeLessThan(0);
    expect(compareRows(a, b, [{ col: 'n', dir: 'desc' }])).toBeGreaterThan(0);
  });

  it('places nulls last by default and first on request', () => {
    const withValue = { id: 'a', n: 1 };
    const withNull = { id: 'b', n: null };
    expect(compareRows(withValue, withNull, [{ col: 'n' }])).toBeLessThan(0);
    expect(compareRows(withValue, withNull, [{ col: 'n', nulls: 'first' }])).toBeGreaterThan(0);
  });

  it('falls through to the next key on a tie', () => {
    const a = { id: 'a', n: 1, m: 2 };
    const b = { id: 'b', n: 1, m: 1 };
    expect(compareRows(a, b, [{ col: 'n' }, { col: 'm' }])).toBeGreaterThan(0);
  });
});

describe('key mapping', () => {
  it('round-trips between camel and snake case', () => {
    expect(toSnake('publishedAt')).toBe('published_at');
    expect(toSnake('registrationRequired')).toBe('registration_required');
    expect(toCamel('published_at')).toBe('publishedAt');
    expect(toCamel('seats_taken')).toBe('seatsTaken');
    expect(toCamel(toSnake('impressionCount'))).toBe('impressionCount');
  });

  it('converts whole rows', () => {
    expect(rowToCamel({ id: '1', published_at: 'x', view_count: 2 })).toEqual({
      id: '1',
      publishedAt: 'x',
      viewCount: 2,
    });
  });
});

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore(
      {
        posts: [
          { id: '1', title: 'Alpha', status: 'PUBLISHED', views: 10 },
          { id: '2', title: 'Beta', status: 'DRAFT', views: 50 },
          { id: '3', title: 'Gamma', status: 'PUBLISHED', views: 30 },
        ],
      },
      { persist: false },
    );
  });

  it('filters, orders and paginates, reporting the unpaginated total', async () => {
    const result = await store.select({
      table: 'posts',
      filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
      order: [{ col: 'views', dir: 'desc' }],
      limit: 1,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe('3');
    // `total` must ignore limit/offset or pagination controls break.
    expect(result.total).toBe(2);
  });

  it('returns copies, so callers cannot mutate stored rows by reference', async () => {
    const first = await store.selectOne({ table: 'posts', filters: [{ op: 'eq', col: 'id', value: '1' }] });
    (first as Row).title = 'Mutated';

    const second = await store.selectOne({ table: 'posts', filters: [{ op: 'eq', col: 'id', value: '1' }] });
    expect(second?.title).toBe('Alpha');
  });

  it('inserts with a generated id and reads back', async () => {
    const created = await store.insert('posts', { title: 'Delta', status: 'PUBLISHED', views: 0 });
    expect(created.id).toBeTruthy();

    const found = await store.selectOne({ table: 'posts', filters: [{ op: 'eq', col: 'id', value: created.id }] });
    expect(found?.title).toBe('Delta');
  });

  it('updates by id and refuses an unknown id', async () => {
    const updated = await store.update('posts', '1', { title: 'Alpha II' });
    expect(updated.title).toBe('Alpha II');
    await expect(store.update('posts', 'nope', { title: 'x' })).rejects.toThrow();
  });

  it('updates and deletes in bulk by filter', async () => {
    const changed = await store.updateWhere(
      'posts',
      [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
      { status: 'ARCHIVED' },
    );
    expect(changed).toBe(2);

    const removed = await store.deleteWhere('posts', [{ op: 'eq', col: 'status', value: 'ARCHIVED' }]);
    expect(removed).toBe(2);

    const remaining = await store.select({ table: 'posts' });
    expect(remaining.total).toBe(1);
  });

  it('increments and never lets a counter go negative', async () => {
    await store.increment('posts', '1', 'views', 5);
    let row = await store.selectOne({ table: 'posts', filters: [{ op: 'eq', col: 'id', value: '1' }] });
    expect(row?.views).toBe(15);

    await store.increment('posts', '1', 'views', -100);
    row = await store.selectOne({ table: 'posts', filters: [{ op: 'eq', col: 'id', value: '1' }] });
    // Both adapters clamp at zero — the SQL function uses `greatest(0, …)`, and
    // the memory store must agree or counters drift on one backend only.
    expect(row?.views).toBe(0);
  });

  it('is a no-op when incrementing a row that does not exist', async () => {
    await expect(store.increment('posts', 'missing', 'views')).resolves.toBeUndefined();
  });
});
