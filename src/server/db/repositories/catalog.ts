import 'server-only';
import { getStore, type Filter } from '@/server/db';
import type {
  Branch, CampusLocation, ExamType, Opportunity, OpportunityType, Paginated,
  PyqPaper, PyqSubject, Resource, ResourceCategory,
} from '@/types/domain';
import { rankBy, scoreOpportunity, type RankingContext } from '@/lib/ranking';

/** Opportunities, resources, the PYQ catalogue and campus locations. */

/* --------------------------------------------------------- opportunities */

export interface OpportunityQuery {
  type?: OpportunityType | 'ALL';
  branch?: Branch;
  year?: number;
  search?: string;
  tag?: string;
  /** Only opportunities whose deadline is within seven days. */
  closingSoon?: boolean;
  includeClosed?: boolean;
  remoteOnly?: boolean;
  status?: Opportunity['status'] | 'ALL';
  page?: number;
  pageSize?: number;
  rankFor?: RankingContext;
}

export async function listOpportunities(query: OpportunityQuery = {}): Promise<Paginated<Opportunity>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 12));
  const now = new Date();

  const filters: Filter[] = [];
  const status = query.status ?? 'PUBLISHED';
  if (status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: status });
  if (!query.includeClosed) filters.push({ op: 'gte', col: 'deadline', value: now.toISOString() });
  if (query.closingSoon) {
    filters.push({ op: 'lte', col: 'deadline', value: new Date(now.getTime() + 7 * 86_400_000).toISOString() });
  }
  if (query.type && query.type !== 'ALL') filters.push({ op: 'eq', col: 'type', value: query.type });
  if (query.remoteOnly) filters.push({ op: 'eq', col: 'remote', value: true });
  if (query.tag) filters.push({ op: 'contains', col: 'tags', values: [query.tag] });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'title', value: query.search },
        { op: 'ilike', col: 'organisation', value: query.search },
        { op: 'ilike', col: 'summary', value: query.search },
      ],
    });
  }

  const { rows, total } = await store.select<Opportunity>({
    table: 'opportunities',
    filters,
    order: [{ col: 'deadline', dir: 'asc' }],
    limit: query.rankFor ? 120 : pageSize,
    offset: query.rankFor ? 0 : (page - 1) * pageSize,
  });

  // Branch/year eligibility is an array-membership test that is cheaper and
  // clearer to apply here than to express as an `or` over both columns.
  let filtered = rows;
  if (query.branch) {
    filtered = filtered.filter((o) => o.branches.length === 0 || o.branches.includes(query.branch!));
  }
  if (query.year !== undefined) {
    filtered = filtered.filter((o) => o.years.length === 0 || o.years.includes(query.year!));
  }

  if (query.rankFor) {
    const ranked = rankBy(filtered, (o) => scoreOpportunity(o, query.rankFor!), (o) => -Date.parse(o.deadline));
    const start = (page - 1) * pageSize;
    const items = ranked.slice(start, start + pageSize);
    return { items, total: ranked.length, page, pageSize, hasMore: start + items.length < ranked.length };
  }

  return { items: filtered, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getOpportunityBySlug(slug: string): Promise<Opportunity | null> {
  const store = await getStore();
  return store.selectOne<Opportunity>({
    table: 'opportunities',
    filters: [{ op: 'eq', col: 'slug', value: slug }],
  });
}

export async function getOpportunitiesByIds(ids: readonly string[]): Promise<Opportunity[]> {
  if (ids.length === 0) return [];
  const store = await getStore();
  const { rows } = await store.select<Opportunity>({
    table: 'opportunities',
    filters: [{ op: 'in', col: 'id', values: [...ids] }],
    order: [{ col: 'deadline', dir: 'asc' }],
  });
  return rows;
}

export async function incrementOpportunityView(id: string): Promise<void> {
  const store = await getStore();
  await store.increment('opportunities', id, 'viewCount');
}

/* -------------------------------------------------------------- resources */

export interface ResourceQuery {
  category?: ResourceCategory | 'ALL';
  search?: string;
  status?: Resource['status'] | 'ALL';
  page?: number;
  pageSize?: number;
}

export async function listResources(query: ResourceQuery = {}): Promise<Paginated<Resource>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 60));
  const filters: Filter[] = [];
  const status = query.status ?? 'PUBLISHED';
  if (status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: status });
  if (query.category && query.category !== 'ALL') filters.push({ op: 'eq', col: 'category', value: query.category });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'title', value: query.search },
        { op: 'ilike', col: 'description', value: query.search },
      ],
    });
  }
  const { rows, total } = await store.select<Resource>({
    table: 'resources',
    filters,
    order: [{ col: 'category', dir: 'asc' }, { col: 'title', dir: 'asc' }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getResourcesByIds(ids: readonly string[]): Promise<Resource[]> {
  if (ids.length === 0) return [];
  const store = await getStore();
  const { rows } = await store.select<Resource>({
    table: 'resources',
    filters: [{ op: 'in', col: 'id', values: [...ids] }],
  });
  return rows;
}

/* -------------------------------------------------------------------- PYQ */

export interface PyqQuery {
  branch?: Branch;
  semester?: number;
  subjectId?: string;
  subjectCode?: string;
  year?: number;
  examType?: ExamType;
  search?: string;
  status?: PyqPaper['status'] | 'ALL';
  sort?: 'recent' | 'popular' | 'year';
  page?: number;
  pageSize?: number;
}

export async function listPyqSubjects(branch?: Branch, semester?: number): Promise<PyqSubject[]> {
  const store = await getStore();
  const filters: Filter[] = [];
  if (branch) filters.push({ op: 'eq', col: 'branch', value: branch });
  if (semester) filters.push({ op: 'eq', col: 'semester', value: semester });
  const { rows } = await store.select<PyqSubject>({
    table: 'pyq_subjects',
    filters,
    order: [{ col: 'semester', dir: 'asc' }, { col: 'code', dir: 'asc' }],
  });
  return rows;
}

export async function getPyqSubjectByCode(code: string): Promise<PyqSubject | null> {
  const store = await getStore();
  return store.selectOne<PyqSubject>({
    table: 'pyq_subjects',
    filters: [{ op: 'eq', col: 'code', value: code.toUpperCase() }],
  });
}

export async function listPyqPapers(query: PyqQuery = {}): Promise<Paginated<PyqPaper>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 24));

  const filters: Filter[] = [];
  const status = query.status ?? 'PUBLISHED';
  if (status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: status });
  if (query.branch) filters.push({ op: 'eq', col: 'branch', value: query.branch });
  if (query.semester) filters.push({ op: 'eq', col: 'semester', value: query.semester });
  if (query.subjectId) filters.push({ op: 'eq', col: 'subjectId', value: query.subjectId });
  if (query.subjectCode) filters.push({ op: 'eq', col: 'subjectCode', value: query.subjectCode.toUpperCase() });
  if (query.year) filters.push({ op: 'eq', col: 'year', value: query.year });
  if (query.examType) filters.push({ op: 'eq', col: 'examType', value: query.examType });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'subjectName', value: query.search },
        { op: 'ilike', col: 'subjectCode', value: query.search },
      ],
    });
  }

  const order =
    query.sort === 'popular'
      ? [{ col: 'downloadCount', dir: 'desc' as const }]
      : query.sort === 'recent'
        ? [{ col: 'createdAt', dir: 'desc' as const }]
        : [{ col: 'year', dir: 'desc' as const }, { col: 'examType', dir: 'asc' as const }];

  const { rows, total } = await store.select<PyqPaper>({
    table: 'pyq_papers',
    filters,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getPyqPapersByIds(ids: readonly string[]): Promise<PyqPaper[]> {
  if (ids.length === 0) return [];
  const store = await getStore();
  const { rows } = await store.select<PyqPaper>({
    table: 'pyq_papers',
    filters: [{ op: 'in', col: 'id', values: [...ids] }],
  });
  return rows;
}

export async function getPyqPaperById(id: string): Promise<PyqPaper | null> {
  const store = await getStore();
  return store.selectOne<PyqPaper>({ table: 'pyq_papers', filters: [{ op: 'eq', col: 'id', value: id }] });
}

/** Branch → paper count, powering the PYQ hub landing grid. */
export async function pyqBranchSummary(): Promise<Array<{ branch: Branch; papers: number; subjects: number }>> {
  const store = await getStore();
  const [{ rows: papers }, { rows: subjects }] = await Promise.all([
    store.select<PyqPaper>({ table: 'pyq_papers', filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }] }),
    store.select<PyqSubject>({ table: 'pyq_subjects' }),
  ]);
  const byBranch = new Map<Branch, { papers: number; subjects: number }>();
  for (const s of subjects) {
    const entry = byBranch.get(s.branch) ?? { papers: 0, subjects: 0 };
    entry.subjects += 1;
    byBranch.set(s.branch, entry);
  }
  for (const p of papers) {
    const entry = byBranch.get(p.branch) ?? { papers: 0, subjects: 0 };
    entry.papers += 1;
    byBranch.set(p.branch, entry);
  }
  return [...byBranch.entries()]
    .map(([branch, v]) => ({ branch, ...v }))
    .sort((a, b) => b.papers - a.papers);
}

export async function incrementPyqDownload(id: string): Promise<void> {
  const store = await getStore();
  await store.increment('pyq_papers', id, 'downloadCount');
}

/* ------------------------------------------------------- campus locations */

export async function listLocations(): Promise<CampusLocation[]> {
  const store = await getStore();
  const { rows } = await store.select<CampusLocation>({
    table: 'campus_locations',
    order: [{ col: 'category', dir: 'asc' }, { col: 'name', dir: 'asc' }],
  });
  return rows;
}

export async function getLocationBySlug(slug: string): Promise<CampusLocation | null> {
  const store = await getStore();
  return store.selectOne<CampusLocation>({
    table: 'campus_locations',
    filters: [{ op: 'eq', col: 'slug', value: slug }],
  });
}
