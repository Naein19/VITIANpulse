import type { SupabaseClient } from '@supabase/supabase-js';
import {
  NotFoundError, rowToCamel, rowToSnake, toSnake,
  type Filter, type LeafFilter, type Query, type QueryResult, type Entity, type Row, type Store, type TableName,
} from './store';

/**
 * PostgREST implementation of the persistence port.
 *
 * Receives a client built for the current request — either the RLS-scoped
 * cookie client (default) or the service-role client for the narrow set of
 * privileged operations that have already passed an explicit server-side
 * permission check.
 */

type Builder = ReturnType<SupabaseClient['from']>;
// PostgREST's fluent builder is not generically typed for dynamic chaining.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyBuilder = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function escapeForOr(value: unknown): string {
  // PostgREST's `or` grammar is comma/parenthesis separated; quote to be safe.
  return `"${String(value).replace(/["\\]/g, '\\$&')}"`;
}

function leafToOrClause(filter: LeafFilter): string {
  const col = toSnake(filter.col);
  switch (filter.op) {
    case 'eq': case 'neq': case 'gt': case 'gte': case 'lt': case 'lte':
      return `${col}.${filter.op}.${escapeForOr(filter.value)}`;
    case 'in':
      return `${col}.in.(${filter.values.map((v) => escapeForOr(v)).join(',')})`;
    case 'ilike':
      return `${col}.ilike.%${String(filter.value).replace(/[%,()]/g, '')}%`;
    case 'contains':
      return `${col}.cs.{${filter.values.join(',')}}`;
    case 'overlaps':
      return `${col}.ov.{${filter.values.join(',')}}`;
    case 'is':
      return `${col}.is.${filter.value === null ? 'null' : String(filter.value)}`;
    default: {
      const exhaustive: never = filter;
      throw new Error(`Unhandled filter ${JSON.stringify(exhaustive)}`);
    }
  }
}

function applyFilters(builder: AnyBuilder, filters: readonly Filter[] = []): AnyBuilder {
  let q = builder;
  for (const filter of filters) {
    const col = filter.op === 'or' ? '' : toSnake(filter.col);
    switch (filter.op) {
      case 'eq': q = q.eq(col, filter.value); break;
      case 'neq': q = q.neq(col, filter.value); break;
      case 'gt': q = q.gt(col, filter.value); break;
      case 'gte': q = q.gte(col, filter.value); break;
      case 'lt': q = q.lt(col, filter.value); break;
      case 'lte': q = q.lte(col, filter.value); break;
      case 'in': q = q.in(col, filter.values as unknown[]); break;
      case 'ilike': q = q.ilike(col, `%${filter.value}%`); break;
      case 'contains': q = q.contains(col, filter.values as unknown[]); break;
      case 'overlaps': q = q.overlaps(col, filter.values as unknown[]); break;
      case 'is': q = q.is(col, filter.value); break;
      case 'or': q = q.or(filter.filters.map(leafToOrClause).join(',')); break;
      default: {
        const exhaustive: never = filter;
        throw new Error(`Unhandled filter ${JSON.stringify(exhaustive)}`);
      }
    }
  }
  return q;
}

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: SupabaseClient) {}

  private from(table: TableName): Builder {
    return this.client.from(table);
  }

  async select<T extends Entity = Row>(query: Query): Promise<QueryResult<T>> {
    let q: AnyBuilder = this.from(query.table).select('*', { count: 'exact' });
    q = applyFilters(q, query.filters);
    for (const o of query.order ?? []) {
      q = q.order(toSnake(o.col), { ascending: o.dir !== 'desc', nullsFirst: o.nulls === 'first' });
    }
    const offset = query.offset ?? 0;
    if (query.limit !== undefined) q = q.range(offset, offset + query.limit - 1);
    else if (offset > 0) q = q.range(offset, offset + 999);

    const { data, error, count } = await q;
    if (error) throw new Error(`select ${query.table}: ${error.message}`);
    const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => rowToCamel<T>(r));
    return { rows, total: count ?? rows.length };
  }

  async selectOne<T extends Entity = Row>(query: Omit<Query, 'limit' | 'offset'>): Promise<T | null> {
    const { rows } = await this.select<T>({ ...query, limit: 1 });
    return rows[0] ?? null;
  }

  async insert<T extends Entity = Row>(table: TableName, values: Omit<T, 'id'> & { id?: string }): Promise<T> {
    const [row] = await this.insertMany<T>(table, [values]);
    if (!row) throw new Error(`insert ${table}: no row returned`);
    return row;
  }

  async insertMany<T extends Entity = Row>(
    table: TableName,
    values: readonly (Omit<T, 'id'> & { id?: string })[],
  ): Promise<T[]> {
    if (values.length === 0) return [];
    const payload = values.map((v) => rowToSnake(v as Record<string, unknown>));
    const { data, error } = await this.from(table).insert(payload).select('*');
    if (error) throw new Error(`insert ${table}: ${error.message}`);
    return ((data ?? []) as Record<string, unknown>[]).map((r) => rowToCamel<T>(r));
  }

  async update<T extends Entity = Row>(table: TableName, id: string, patch: Partial<NoInfer<T>>): Promise<T> {
    const { data, error } = await this.from(table)
      .update(rowToSnake(patch as Record<string, unknown>))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`update ${table}: ${error.message}`);
    if (!data) throw new NotFoundError(table, id);
    return rowToCamel<T>(data as Record<string, unknown>);
  }

  async updateWhere(table: TableName, filters: readonly Filter[], patch: Record<string, unknown>): Promise<number> {
    let q: AnyBuilder = this.from(table).update(rowToSnake(patch));
    q = applyFilters(q, filters);
    const { data, error } = await q.select('id');
    if (error) throw new Error(`updateWhere ${table}: ${error.message}`);
    return (data ?? []).length;
  }

  async delete(table: TableName, id: string): Promise<void> {
    const { error } = await this.from(table).delete().eq('id', id);
    if (error) throw new Error(`delete ${table}: ${error.message}`);
  }

  async deleteWhere(table: TableName, filters: readonly Filter[]): Promise<number> {
    let q: AnyBuilder = this.from(table).delete();
    q = applyFilters(q, filters);
    const { data, error } = await q.select('id');
    if (error) throw new Error(`deleteWhere ${table}: ${error.message}`);
    return (data ?? []).length;
  }

  async increment(table: TableName, id: string, column: string, by = 1): Promise<void> {
    // `bump_counter` is a SECURITY DEFINER function with a hard allowlist of
    // (table, column) pairs — see supabase/migrations/0003_functions.sql. Doing
    // this in SQL avoids the read-modify-write race a client-side bump has.
    const { error } = await this.client.rpc('bump_counter', {
      p_table: table,
      p_column: toSnake(column),
      p_id: id,
      p_by: by,
    });
    if (error) throw new Error(`increment ${table}.${column}: ${error.message}`);
  }
}
