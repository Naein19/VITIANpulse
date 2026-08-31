import 'server-only';
import { getStore, type Filter, type OrderBy } from '@/server/db';
import type {
  ClubSummary, Importance, Paginated, Post, PostCategory, PostWithRelations, PublicAuthor, Profile, Club,
} from '@/types/domain';
import { makeContext, rankBy, scorePost, type RankingContext } from '@/lib/ranking';

/** Read/write access to campus posts, with author and club joined in. */

export interface PostQuery {
  category?: PostCategory | 'ALL';
  importance?: Importance;
  clubId?: string;
  tag?: string;
  search?: string;
  status?: Post['status'];
  authorId?: string;
  page?: number;
  pageSize?: number;
  /** When set, results are ranked for this viewer instead of sorted by date. */
  rankFor?: RankingContext;
}

export function toPublicAuthor(profile: Pick<Profile, 'id' | 'displayName' | 'username' | 'avatarUrl'>): PublicAuthor {
  return {
    id: profile.id,
    displayName: profile.displayName,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
  };
}

export function toClubSummary(club: Club): ClubSummary {
  return {
    id: club.id,
    slug: club.slug,
    name: club.name,
    shortName: club.shortName,
    logoUrl: club.logoUrl,
    category: club.category,
    verified: club.verified,
  };
}

/**
 * Joins authors and clubs onto a batch of rows with two lookups rather than one
 * per row — the store port has no join, so batching is the repository's job.
 */
export async function hydratePosts(posts: readonly Post[]): Promise<PostWithRelations[]> {
  if (posts.length === 0) return [];
  const store = await getStore();

  const authorIds = [...new Set(posts.map((p) => p.authorId).filter(Boolean))];
  const clubIds = [...new Set(posts.map((p) => p.clubId).filter((id): id is string => Boolean(id)))];

  const [authors, clubs] = await Promise.all([
    authorIds.length
      ? store.select<Profile>({ table: 'profiles', filters: [{ op: 'in', col: 'id', values: authorIds }] })
      : Promise.resolve({ rows: [] as Profile[], total: 0 }),
    clubIds.length
      ? store.select<Club>({ table: 'clubs', filters: [{ op: 'in', col: 'id', values: clubIds }] })
      : Promise.resolve({ rows: [] as Club[], total: 0 }),
  ]);

  const authorById = new Map(authors.rows.map((a) => [a.id, toPublicAuthor(a)]));
  const clubById = new Map(clubs.rows.map((c) => [c.id, toClubSummary(c)]));

  return posts.map((post) => ({
    ...post,
    author: authorById.get(post.authorId) ?? null,
    club: post.clubId ? (clubById.get(post.clubId) ?? null) : null,
  }));
}

function buildFilters(query: PostQuery): Filter[] {
  const filters: Filter[] = [{ op: 'eq', col: 'status', value: query.status ?? 'PUBLISHED' }];
  if (query.category && query.category !== 'ALL') filters.push({ op: 'eq', col: 'category', value: query.category });
  if (query.importance) filters.push({ op: 'eq', col: 'importance', value: query.importance });
  if (query.clubId) filters.push({ op: 'eq', col: 'clubId', value: query.clubId });
  if (query.authorId) filters.push({ op: 'eq', col: 'authorId', value: query.authorId });
  if (query.tag) filters.push({ op: 'contains', col: 'tags', values: [query.tag] });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'title', value: query.search },
        { op: 'ilike', col: 'summary', value: query.search },
      ],
    });
  }
  return filters;
}

const DEFAULT_ORDER: OrderBy[] = [
  { col: 'pinned', dir: 'desc' },
  { col: 'publishedAt', dir: 'desc', nulls: 'last' },
];

export async function listPosts(query: PostQuery = {}): Promise<Paginated<PostWithRelations>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 12));
  const filters = buildFilters(query);

  // Ranked feeds need the candidate set before scoring, so fetch a bounded
  // window and rank inside it rather than paging the database by score.
  if (query.rankFor) {
    const { rows, total } = await store.select<Post>({
      table: 'posts',
      filters,
      order: DEFAULT_ORDER,
      limit: 120,
    });
    const hydrated = await hydratePosts(rows);
    const ranked = rankBy(hydrated, (p) => scorePost(p, query.rankFor!), (p) => Date.parse(p.publishedAt ?? '0'));
    const start = (page - 1) * pageSize;
    const items = ranked.slice(start, start + pageSize);
    return { items, total, page, pageSize, hasMore: start + items.length < ranked.length };
  }

  const { rows, total } = await store.select<Post>({
    table: 'posts',
    filters,
    order: DEFAULT_ORDER,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const items = await hydratePosts(rows);
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getPostBySlug(slug: string): Promise<PostWithRelations | null> {
  const store = await getStore();
  const post = await store.selectOne<Post>({
    table: 'posts',
    filters: [{ op: 'eq', col: 'slug', value: slug }],
  });
  if (!post) return null;
  const [hydrated] = await hydratePosts([post]);
  return hydrated ?? null;
}

export async function getPostById(id: string): Promise<PostWithRelations | null> {
  const store = await getStore();
  const post = await store.selectOne<Post>({ table: 'posts', filters: [{ op: 'eq', col: 'id', value: id }] });
  if (!post) return null;
  const [hydrated] = await hydratePosts([post]);
  return hydrated ?? null;
}

export async function getPostsByIds(ids: readonly string[]): Promise<PostWithRelations[]> {
  if (ids.length === 0) return [];
  const store = await getStore();
  const { rows } = await store.select<Post>({
    table: 'posts',
    filters: [{ op: 'in', col: 'id', values: [...ids] }],
  });
  return hydratePosts(rows);
}

/** Posts marked IMPORTANT or URGENT that are still current. */
export async function listImportantPosts(limit = 4): Promise<PostWithRelations[]> {
  const store = await getStore();
  const { rows } = await store.select<Post>({
    table: 'posts',
    filters: [
      { op: 'eq', col: 'status', value: 'PUBLISHED' },
      { op: 'in', col: 'importance', values: ['IMPORTANT', 'URGENT'] },
    ],
    order: [{ col: 'publishedAt', dir: 'desc' }],
    limit: limit * 3,
  });
  const now = Date.now();
  const current = rows.filter((p) => !p.expiresAt || Date.parse(p.expiresAt) > now);
  const hydrated = await hydratePosts(current.slice(0, limit));
  // URGENT first, then most recent.
  return hydrated.sort(
    (a, b) =>
      (b.importance === 'URGENT' ? 1 : 0) - (a.importance === 'URGENT' ? 1 : 0) ||
      Date.parse(b.publishedAt ?? '0') - Date.parse(a.publishedAt ?? '0'),
  );
}

/** Same-category or same-club posts, excluding the one being read. */
export async function listRelatedPosts(post: Post, limit = 3): Promise<PostWithRelations[]> {
  const store = await getStore();
  const { rows } = await store.select<Post>({
    table: 'posts',
    filters: [
      { op: 'eq', col: 'status', value: 'PUBLISHED' },
      { op: 'neq', col: 'id', value: post.id },
      {
        op: 'or',
        filters: [
          { op: 'eq', col: 'category', value: post.category },
          ...(post.clubId ? [{ op: 'eq' as const, col: 'clubId', value: post.clubId }] : []),
        ],
      },
    ],
    order: [{ col: 'publishedAt', dir: 'desc' }],
    limit,
  });
  return hydratePosts(rows);
}

export async function listPostsForAdmin(query: Omit<PostQuery, 'status'> & { status?: Post['status'] | 'ALL' } = {}) {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, query.pageSize ?? 20);
  const filters: Filter[] = [];
  if (query.status && query.status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: query.status });
  if (query.category && query.category !== 'ALL') filters.push({ op: 'eq', col: 'category', value: query.category });
  if (query.clubId) filters.push({ op: 'eq', col: 'clubId', value: query.clubId });
  if (query.search) {
    filters.push({ op: 'ilike', col: 'title', value: query.search });
  }
  const { rows, total } = await store.select<Post>({
    table: 'posts',
    filters,
    order: [{ col: 'updatedAt', dir: 'desc' }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const items = await hydratePosts(rows);
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function incrementPostView(id: string): Promise<void> {
  const store = await getStore();
  await store.increment('posts', id, 'viewCount');
}

export { makeContext };
