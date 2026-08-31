/**
 * The persistence port.
 *
 * Repositories are written once against this interface. Two adapters implement
 * it: `SupabaseStore` (PostgREST over Postgres, used whenever Supabase env vars
 * are present) and `MemoryStore` (a seeded, file-backed store used for local
 * development, tests and preview builds without credentials).
 *
 * The port speaks camelCase. The Supabase adapter converts to and from the
 * snake_case columns declared in supabase/migrations, so no repository has to
 * know which backend it is talking to.
 */

export type Scalar = string | number | boolean | null;

export type Filter =
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; col: string; value: Scalar }
  | { op: 'in'; col: string; values: readonly Scalar[] }
  /** Case-insensitive substring match. */
  | { op: 'ilike'; col: string; value: string }
  /** Array column contains every listed value. */
  | { op: 'contains'; col: string; values: readonly Scalar[] }
  /** Array column shares at least one value. */
  | { op: 'overlaps'; col: string; values: readonly Scalar[] }
  | { op: 'is'; col: string; value: null | boolean }
  /** Disjunction of leaf filters (no nesting — keeps PostgREST translation safe). */
  | { op: 'or'; filters: readonly LeafFilter[] };

export type LeafFilter = Exclude<Filter, { op: 'or' }>;

export interface OrderBy {
  col: string;
  dir?: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export interface Query {
  table: TableName;
  filters?: readonly Filter[];
  order?: readonly OrderBy[];
  limit?: number;
  offset?: number;
}

export interface QueryResult<T> {
  rows: T[];
  /** Total rows matching the filters, ignoring limit/offset. */
  total: number;
}

export const TABLES = [
  'profiles',
  'clubs',
  'club_members',
  'club_social_links',
  'club_follows',
  'posts',
  'events',
  'event_registrations',
  'opportunities',
  'resources',
  'pyq_subjects',
  'pyq_papers',
  'pyq_requests',
  'bookmarks',
  'notifications',
  'notification_prefs',
  'ads',
  'ad_events',
  'discussions',
  'comments',
  'votes',
  'reports',
  'lost_found',
  'campus_locations',
  'audit_logs',
  'analytics_events',
] as const;

export type TableName = (typeof TABLES)[number];

/** A persisted row: an object with an `id` plus arbitrary column values. */
export type Row = Record<string, unknown> & { id: string };

/**
 * The generic constraint used by the store methods. Domain interfaces (which
 * have no index signature) satisfy this, while `Row` remains available for
 * untyped access.
 */
export type Entity = { id: string };

export interface Store {
  readonly kind: 'memory' | 'supabase';
  select<T extends Entity = Row>(query: Query): Promise<QueryResult<T>>;
  selectOne<T extends Entity = Row>(query: Omit<Query, 'limit' | 'offset'>): Promise<T | null>;
  insert<T extends Entity = Row>(table: TableName, values: Omit<T, 'id'> & { id?: string }): Promise<T>;
  insertMany<T extends Entity = Row>(table: TableName, values: readonly (Omit<T, 'id'> & { id?: string })[]): Promise<T[]>;
  /** `NoInfer` keeps `T` pinned to the explicit type argument rather than
   *  being widened from the patch object, so a partial update stays checked. */
  update<T extends Entity = Row>(table: TableName, id: string, patch: Partial<NoInfer<T>>): Promise<T>;
  /** Applies the same patch to every row matching `filters`. Returns rows changed. */
  updateWhere(table: TableName, filters: readonly Filter[], patch: Record<string, unknown>): Promise<number>;
  delete(table: TableName, id: string): Promise<void>;
  deleteWhere(table: TableName, filters: readonly Filter[]): Promise<number>;
  /** Atomic-ish counter bump. Used for view/download/impression counters. */
  increment(table: TableName, id: string, column: string, by?: number): Promise<void>;
}

/* ------------------------------------------------------------- predicates */

function toComparable(value: unknown): string | number {
  if (value === null || value === undefined) return Number.NEGATIVE_INFINITY;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return String(value);
}

/** Shared filter evaluation, used by MemoryStore and by tests. */
export function matchesFilter(row: Record<string, unknown>, filter: Filter): boolean {
  if (filter.op === 'or') return filter.filters.some((f) => matchesFilter(row, f));

  const cell = row[filter.col];

  switch (filter.op) {
    case 'eq':
      return cell === filter.value;
    case 'neq':
      return cell !== filter.value;
    case 'gt':
      return toComparable(cell) > toComparable(filter.value);
    case 'gte':
      return toComparable(cell) >= toComparable(filter.value);
    case 'lt':
      return toComparable(cell) < toComparable(filter.value);
    case 'lte':
      return toComparable(cell) <= toComparable(filter.value);
    case 'in':
      return filter.values.includes(cell as Scalar);
    case 'ilike':
      return typeof cell === 'string' && cell.toLowerCase().includes(filter.value.toLowerCase());
    case 'contains':
      return Array.isArray(cell) && filter.values.every((v) => (cell as Scalar[]).includes(v));
    case 'overlaps':
      return Array.isArray(cell) && filter.values.some((v) => (cell as Scalar[]).includes(v));
    case 'is':
      return filter.value === null ? cell === null || cell === undefined : cell === filter.value;
    default: {
      const exhaustive: never = filter;
      throw new Error(`Unhandled filter: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function matchesAll(row: Record<string, unknown>, filters: readonly Filter[] = []): boolean {
  return filters.every((f) => matchesFilter(row, f));
}

export function compareRows(a: Record<string, unknown>, b: Record<string, unknown>, order: readonly OrderBy[]): number {
  for (const { col, dir = 'asc', nulls = 'last' } of order) {
    const av = a[col];
    const bv = b[col];
    const aNull = av === null || av === undefined;
    const bNull = bv === null || bv === undefined;
    if (aNull !== bNull) return (aNull ? 1 : -1) * (nulls === 'last' ? 1 : -1);
    if (aNull && bNull) continue;
    const ac = toComparable(av);
    const bc = toComparable(bv);
    if (ac === bc) continue;
    const cmp = ac < bc ? -1 : 1;
    return dir === 'desc' ? -cmp : cmp;
  }
  return 0;
}

/* ------------------------------------------------------------ key mapping */

const camelCache = new Map<string, string>();
const snakeCache = new Map<string, string>();

export function toSnake(key: string): string {
  const hit = snakeCache.get(key);
  if (hit) return hit;
  const out = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  snakeCache.set(key, out);
  return out;
}

export function toCamel(key: string): string {
  const hit = camelCache.get(key);
  if (hit) return hit;
  const out = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  camelCache.set(key, out);
  return out;
}

export function rowToCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out as T;
}

export function rowToSnake(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toSnake(k)] = v;
  return out;
}

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;
  constructor(entity: string, id?: string) {
    super(id ? `${entity} ${id} was not found` : `${entity} was not found`);
    this.name = 'NotFoundError';
  }
}
