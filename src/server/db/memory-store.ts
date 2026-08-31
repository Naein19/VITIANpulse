import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  compareRows, matchesAll, NotFoundError,
  type Filter, type Query, type QueryResult, type Entity, type Row, type Store, type TableName,
} from './store';

/**
 * File-backed in-memory store.
 *
 * Used when Supabase credentials are absent so the whole product — including
 * every mutation, moderation workflow and analytics counter — genuinely runs
 * locally. Writes are flushed to `.vitpulse-data/db.json` (git-ignored) so state
 * survives a dev-server restart. It is explicitly *not* a production backend:
 * `getStore()` refuses to fall back to it in production.
 */

type Tables = Partial<Record<TableName, Row[]>>;

const DATA_DIR = process.env.VITPULSE_DATA_DIR ?? join(process.cwd(), '.vitpulse-data');
const DATA_FILE = join(DATA_DIR, 'db.json');

export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private tables: Tables = {};
  private dirty = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    seed: Tables,
    private readonly options: { persist?: boolean } = {},
  ) {
    const restored = options.persist ? this.restore() : null;
    this.tables = restored ?? structuredClone(seed);
  }

  private restore(): Tables | null {
    try {
      if (!existsSync(DATA_FILE)) return null;
      const raw = readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as { version: number; tables: Tables };
      if (parsed.version !== SNAPSHOT_VERSION) return null;
      return parsed.tables;
    } catch {
      return null;
    }
  }

  /** Debounced write-behind so a burst of mutations costs one fsync. */
  private schedulePersist(): void {
    if (!this.options.persist) return;
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 120);
    this.flushTimer.unref?.();
  }

  flush(): void {
    if (!this.options.persist || !this.dirty) return;
    try {
      mkdirSync(dirname(DATA_FILE), { recursive: true });
      writeFileSync(DATA_FILE, JSON.stringify({ version: SNAPSHOT_VERSION, tables: this.tables }));
      this.dirty = false;
    } catch (error) {
      console.warn('[vitpulse] could not persist local data:', (error as Error).message);
    }
  }

  private tableOf(table: TableName): Row[] {
    return (this.tables[table] ??= []);
  }

  async select<T extends Entity = Row>(query: Query): Promise<QueryResult<T>> {
    const all = this.tableOf(query.table);
    const matched = query.filters?.length ? all.filter((r) => matchesAll(r, query.filters)) : all.slice();
    if (query.order?.length) matched.sort((a, b) => compareRows(a, b, query.order!));
    const offset = query.offset ?? 0;
    const limited = query.limit === undefined ? matched.slice(offset) : matched.slice(offset, offset + query.limit);
    return { rows: structuredClone(limited) as T[], total: matched.length };
  }

  async selectOne<T extends Entity = Row>(query: Omit<Query, 'limit' | 'offset'>): Promise<T | null> {
    const { rows } = await this.select<T>({ ...query, limit: 1 });
    return rows[0] ?? null;
  }

  async insert<T extends Entity = Row>(table: TableName, values: Omit<T, 'id'> & { id?: string }): Promise<T> {
    const [row] = await this.insertMany<T>(table, [values]);
    return row as T;
  }

  async insertMany<T extends Entity = Row>(
    table: TableName,
    values: readonly (Omit<T, 'id'> & { id?: string })[],
  ): Promise<T[]> {
    const rows = this.tableOf(table);
    const created = values.map((v) => ({ ...structuredClone(v), id: v.id ?? randomUUID() }) as Row);
    rows.push(...created);
    this.schedulePersist();
    return structuredClone(created) as T[];
  }

  async update<T extends Entity = Row>(table: TableName, id: string, patch: Partial<NoInfer<T>>): Promise<T> {
    const rows = this.tableOf(table);
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) throw new NotFoundError(table, id);
    const next = { ...rows[index], ...structuredClone(patch), id } as Row;
    rows[index] = next;
    this.schedulePersist();
    return structuredClone(next) as T;
  }

  async updateWhere(table: TableName, filters: readonly Filter[], patch: Record<string, unknown>): Promise<number> {
    const rows = this.tableOf(table);
    let changed = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      if (!matchesAll(row, filters)) continue;
      rows[i] = { ...row, ...structuredClone(patch), id: row.id };
      changed += 1;
    }
    if (changed) this.schedulePersist();
    return changed;
  }

  async delete(table: TableName, id: string): Promise<void> {
    const rows = this.tableOf(table);
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return;
    rows.splice(index, 1);
    this.schedulePersist();
  }

  async deleteWhere(table: TableName, filters: readonly Filter[]): Promise<number> {
    const rows = this.tableOf(table);
    const keep = rows.filter((r) => !matchesAll(r, filters));
    const removed = rows.length - keep.length;
    if (removed) {
      this.tables[table] = keep;
      this.schedulePersist();
    }
    return removed;
  }

  async increment(table: TableName, id: string, column: string, by = 1): Promise<void> {
    const rows = this.tableOf(table);
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const current = typeof row[column] === 'number' ? (row[column] as number) : 0;
    // Clamped at zero to match `bump_counter`'s `greatest(0, …)` in SQL. The two
    // adapters must agree, or a counter drifts negative only on one backend.
    row[column] = Math.max(0, current + by);
    this.schedulePersist();
  }

  /** Test helper: replaces all data. */
  reset(seed: Tables): void {
    this.tables = structuredClone(seed);
    this.schedulePersist();
  }
}

/** Bumping this invalidates any snapshot written by an older schema. */
export const SNAPSHOT_VERSION = 4;
