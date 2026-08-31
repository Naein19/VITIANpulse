import 'server-only';
import { getPrivilegedStore, type Filter } from '@/server/db';
import type { AuditLogEntry, Paginated, Profile, Role } from '@/types/domain';

/** User administration and the audit trail. */

export interface UserQuery {
  search?: string;
  role?: Role | 'ALL';
  suspended?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listUsers(query: UserQuery = {}): Promise<Paginated<Profile>> {
  const store = await getPrivilegedStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));

  const filters: Filter[] = [];
  if (query.role && query.role !== 'ALL') filters.push({ op: 'eq', col: 'role', value: query.role });
  if (query.suspended !== undefined) filters.push({ op: 'eq', col: 'suspended', value: query.suspended });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'displayName', value: query.search },
        { op: 'ilike', col: 'username', value: query.search },
        { op: 'ilike', col: 'email', value: query.search },
        { op: 'ilike', col: 'registrationNumber', value: query.search },
      ],
    });
  }

  const { rows, total } = await store.select<Profile>({
    table: 'profiles',
    filters,
    order: [{ col: 'createdAt', dir: 'desc' }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const store = await getPrivilegedStore();
  return store.selectOne<Profile>({ table: 'profiles', filters: [{ op: 'eq', col: 'id', value: id }] });
}

export async function roleDistribution(): Promise<Record<string, number>> {
  const store = await getPrivilegedStore();
  const { rows } = await store.select<Profile>({ table: 'profiles', limit: 5_000 });
  const out: Record<string, number> = {};
  for (const row of rows) out[row.role] = (out[row.role] ?? 0) + 1;
  return out;
}

/* ------------------------------------------------------------- audit log */

export interface AuditInput {
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string | null;
}

/**
 * Appends to the audit trail.
 *
 * Every privileged mutation calls this. Failures are logged but never propagate:
 * an audit write must not be able to roll back the action it describes, and a
 * missing audit row is a monitoring problem, not a user-facing error.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const store = await getPrivilegedStore();
    await store.insert<AuditLogEntry>('audit_logs', {
      actorId: input.actorId,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      detail: input.detail ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[vitpulse] audit write failed:', (error as Error).message);
  }
}

export async function listAuditLog(limit = 60, entityType?: string): Promise<AuditLogEntry[]> {
  const store = await getPrivilegedStore();
  const filters: Filter[] = [];
  if (entityType) filters.push({ op: 'eq', col: 'entityType', value: entityType });
  const { rows } = await store.select<AuditLogEntry>({
    table: 'audit_logs',
    filters,
    order: [{ col: 'createdAt', dir: 'desc' }],
    limit,
  });
  return rows;
}
