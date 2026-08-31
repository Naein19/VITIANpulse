import 'server-only';
import { getStore, getPrivilegedStore, type Filter } from '@/server/db';
import type {
  Comment, Discussion, DiscussionCategory, LostFoundItem, Paginated, Profile,
  PublicLostFoundItem, Report, ReportStatus,
} from '@/types/domain';
import { toPublicAuthor } from './posts';

/** Discussions, comments, lost & found, and the moderation queue. */

/* ------------------------------------------------------------ discussions */

export interface DiscussionQuery {
  category?: DiscussionCategory | 'ALL';
  search?: string;
  sort?: 'recent' | 'top' | 'active';
  includeHidden?: boolean;
  page?: number;
  pageSize?: number;
}

async function hydrateAuthors<T extends { authorId: string }>(
  rows: readonly T[],
): Promise<Array<T & { author: ReturnType<typeof toPublicAuthor> | null }>> {
  if (rows.length === 0) return [];
  const store = await getStore();
  const ids = [...new Set(rows.map((r) => r.authorId))];
  const { rows: profiles } = await store.select<Profile>({
    table: 'profiles',
    filters: [{ op: 'in', col: 'id', values: ids }],
  });
  const byId = new Map(profiles.map((p) => [p.id, toPublicAuthor(p)]));
  return rows.map((row) => ({ ...row, author: byId.get(row.authorId) ?? null }));
}

export async function listDiscussions(query: DiscussionQuery = {}): Promise<Paginated<Discussion>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));

  const filters: Filter[] = [];
  if (!query.includeHidden) filters.push({ op: 'eq', col: 'hidden', value: false });
  if (query.category && query.category !== 'ALL') filters.push({ op: 'eq', col: 'category', value: query.category });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'title', value: query.search },
        { op: 'ilike', col: 'body', value: query.search },
      ],
    });
  }

  const order =
    query.sort === 'top'
      ? [{ col: 'upvoteCount', dir: 'desc' as const }]
      : query.sort === 'active'
        ? [{ col: 'updatedAt', dir: 'desc' as const }]
        : [{ col: 'createdAt', dir: 'desc' as const }];

  const { rows, total } = await store.select<Omit<Discussion, 'author'>>({
    table: 'discussions',
    filters,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const items = (await hydrateAuthors(rows)) as Discussion[];
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getDiscussionBySlug(slug: string): Promise<Discussion | null> {
  const store = await getStore();
  const row = await store.selectOne<Omit<Discussion, 'author'>>({
    table: 'discussions',
    filters: [{ op: 'eq', col: 'slug', value: slug }],
  });
  if (!row) return null;
  const [hydrated] = await hydrateAuthors([row]);
  return (hydrated as Discussion) ?? null;
}

export async function listComments(
  targetType: Comment['targetType'],
  targetId: string,
  includeHidden = false,
): Promise<Comment[]> {
  const store = await getStore();
  const filters: Filter[] = [
    { op: 'eq', col: 'targetType', value: targetType },
    { op: 'eq', col: 'targetId', value: targetId },
  ];
  if (!includeHidden) filters.push({ op: 'eq', col: 'hidden', value: false });
  const { rows } = await store.select<Omit<Comment, 'author'>>({
    table: 'comments',
    filters,
    order: [{ col: 'createdAt', dir: 'asc' }],
  });
  return (await hydrateAuthors(rows)) as Comment[];
}

export async function countComments(targetType: Comment['targetType'], targetId: string): Promise<number> {
  const store = await getStore();
  const { total } = await store.select({
    table: 'comments',
    filters: [
      { op: 'eq', col: 'targetType', value: targetType },
      { op: 'eq', col: 'targetId', value: targetId },
      { op: 'eq', col: 'hidden', value: false },
    ],
    limit: 1,
  });
  return total;
}

/** Ids the viewer has already upvoted, so the UI can render the toggled state. */
export async function upvotedIds(userId: string | null, targetType: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const store = await getStore();
  const { rows } = await store.select<{ id: string; targetId: string }>({
    table: 'votes',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'eq', col: 'targetType', value: targetType },
    ],
  });
  return new Set(rows.map((r) => r.targetId));
}

/* ----------------------------------------------------------- lost & found */

/**
 * Strips the reporter's contact details.
 * Anonymous visitors never receive them; signed-in students get them on the
 * detail page only, which keeps a scraper from harvesting the whole list.
 */
export function toPublicLostFound(item: LostFoundItem): PublicLostFoundItem {
  const { contactValue: _contactValue, reporterId: _reporterId, ...rest } = item;
  return { ...rest, contactAvailable: Boolean(item.contactValue) };
}

export interface LostFoundQuery {
  kind?: 'LOST' | 'FOUND' | 'ALL';
  search?: string;
  status?: LostFoundItem['status'] | 'ALL';
  page?: number;
  pageSize?: number;
}

export async function listLostFound(query: LostFoundQuery = {}): Promise<Paginated<LostFoundItem>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 24));

  const filters: Filter[] = [];
  const status = query.status ?? 'OPEN';
  if (status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: status });
  if (query.kind && query.kind !== 'ALL') filters.push({ op: 'eq', col: 'kind', value: query.kind });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'title', value: query.search },
        { op: 'ilike', col: 'description', value: query.search },
        { op: 'ilike', col: 'locationText', value: query.search },
      ],
    });
  }

  const { rows, total } = await store.select<LostFoundItem>({
    table: 'lost_found',
    filters,
    order: [{ col: 'happenedOn', dir: 'desc' }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getLostFoundById(id: string): Promise<LostFoundItem | null> {
  const store = await getStore();
  return store.selectOne<LostFoundItem>({ table: 'lost_found', filters: [{ op: 'eq', col: 'id', value: id }] });
}

/* ------------------------------------------------------------ moderation */

export interface ReportWithContext extends Report {
  reporter: ReturnType<typeof toPublicAuthor> | null;
  /** A short human description of what was reported, resolved per target type. */
  targetLabel: string;
  targetHref: string | null;
}

export async function listReports(status: ReportStatus | 'ALL' = 'OPEN'): Promise<ReportWithContext[]> {
  const store = await getPrivilegedStore();
  const filters: Filter[] = [];
  if (status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: status });
  const { rows } = await store.select<Report>({
    table: 'reports',
    filters,
    order: [{ col: 'createdAt', dir: 'desc' }],
    limit: 100,
  });
  if (rows.length === 0) return [];

  const reporterIds = [...new Set(rows.map((r) => r.reporterId))];
  const { rows: profiles } = await store.select<Profile>({
    table: 'profiles',
    filters: [{ op: 'in', col: 'id', values: reporterIds }],
  });
  const byId = new Map(profiles.map((p) => [p.id, toPublicAuthor(p)]));

  return Promise.all(rows.map(async (report) => ({
    ...report,
    reporter: byId.get(report.reporterId) ?? null,
    ...(await describeTarget(report)),
  })));
}

async function describeTarget(report: Report): Promise<{ targetLabel: string; targetHref: string | null }> {
  const store = await getPrivilegedStore();
  const byId = (table: Parameters<typeof store.selectOne>[0]['table']) =>
    store.selectOne({ table, filters: [{ op: 'eq', col: 'id', value: report.targetId }] });

  switch (report.targetType) {
    case 'POST': {
      const row = (await byId('posts')) as { title?: string; slug?: string } | null;
      return { targetLabel: row?.title ?? 'Deleted post', targetHref: row?.slug ? `/news/${row.slug}` : null };
    }
    case 'EVENT': {
      const row = (await byId('events')) as { title?: string; slug?: string } | null;
      return { targetLabel: row?.title ?? 'Deleted event', targetHref: row?.slug ? `/events/${row.slug}` : null };
    }
    case 'DISCUSSION': {
      const row = (await byId('discussions')) as { title?: string; slug?: string } | null;
      return {
        targetLabel: row?.title ?? 'Deleted discussion',
        targetHref: row?.slug ? `/discussions/${row.slug}` : null,
      };
    }
    case 'COMMENT': {
      const row = (await byId('comments')) as { body?: string } | null;
      return { targetLabel: row?.body?.slice(0, 90) ?? 'Deleted comment', targetHref: null };
    }
    case 'PYQ': {
      const row = (await byId('pyq_papers')) as { subjectCode?: string; examType?: string; year?: number } | null;
      return {
        targetLabel: row ? `${row.subjectCode} · ${row.examType} ${row.year}` : 'Deleted paper',
        targetHref: null,
      };
    }
    case 'LOST_FOUND': {
      const row = (await byId('lost_found')) as { title?: string } | null;
      return { targetLabel: row?.title ?? 'Deleted listing', targetHref: '/lost-found' };
    }
    case 'AD': {
      const row = (await byId('ads')) as { name?: string } | null;
      return { targetLabel: row?.name ?? 'Deleted campaign', targetHref: '/admin/ads' };
    }
    default:
      return { targetLabel: 'Unknown', targetHref: null };
  }
}

export async function countOpenReports(): Promise<number> {
  const store = await getPrivilegedStore();
  const { total } = await store.select({
    table: 'reports',
    filters: [{ op: 'eq', col: 'status', value: 'OPEN' }],
    limit: 1,
  });
  return total;
}
