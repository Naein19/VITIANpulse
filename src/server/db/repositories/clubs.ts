import 'server-only';
import { getStore, type Filter } from '@/server/db';
import type {
  Club, ClubCategory, ClubMember, ClubSocialLink, ClubWithRelations, Paginated, RecruitmentStatus,
} from '@/types/domain';

/** Read access to the club directory. */

export interface ClubQuery {
  category?: ClubCategory | 'ALL';
  recruitment?: RecruitmentStatus | 'ALL';
  search?: string;
  verifiedOnly?: boolean;
  status?: Club['status'] | 'ALL';
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'followers' | 'recent';
}

export async function listClubs(query: ClubQuery = {}): Promise<Paginated<Club>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, query.pageSize ?? 24));

  const filters: Filter[] = [];
  const status = query.status ?? 'PUBLISHED';
  if (status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: status });
  if (query.category && query.category !== 'ALL') filters.push({ op: 'eq', col: 'category', value: query.category });
  if (query.recruitment && query.recruitment !== 'ALL') {
    filters.push({ op: 'eq', col: 'recruitmentStatus', value: query.recruitment });
  }
  if (query.verifiedOnly) filters.push({ op: 'eq', col: 'verified', value: true });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'name', value: query.search },
        { op: 'ilike', col: 'shortName', value: query.search },
        { op: 'ilike', col: 'tagline', value: query.search },
      ],
    });
  }

  const order =
    query.sort === 'followers'
      ? [{ col: 'followerCount', dir: 'desc' as const }]
      : query.sort === 'recent'
        ? [{ col: 'updatedAt', dir: 'desc' as const }]
        : [{ col: 'name', dir: 'asc' as const }];

  const { rows, total } = await store.select<Club>({
    table: 'clubs',
    filters,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getClubBySlug(slug: string): Promise<ClubWithRelations | null> {
  const store = await getStore();
  const club = await store.selectOne<Club>({ table: 'clubs', filters: [{ op: 'eq', col: 'slug', value: slug }] });
  if (!club) return null;
  return hydrateClub(club);
}

export async function getClubById(id: string): Promise<ClubWithRelations | null> {
  const store = await getStore();
  const club = await store.selectOne<Club>({ table: 'clubs', filters: [{ op: 'eq', col: 'id', value: id }] });
  if (!club) return null;
  return hydrateClub(club);
}

async function hydrateClub(club: Club): Promise<ClubWithRelations> {
  const store = await getStore();
  const [socials, members] = await Promise.all([
    store.select<ClubSocialLink>({
      table: 'club_social_links',
      filters: [{ op: 'eq', col: 'clubId', value: club.id }],
    }),
    store.select<ClubMember>({
      table: 'club_members',
      filters: [
        { op: 'eq', col: 'clubId', value: club.id },
        { op: 'in', col: 'clubRole', values: ['ADMIN', 'LEAD', 'CORE'] },
      ],
    }),
  ]);
  return { ...club, socialLinks: socials.rows, coordinators: members.rows };
}

export async function getClubsByIds(ids: readonly string[]): Promise<Club[]> {
  if (ids.length === 0) return [];
  const store = await getStore();
  const { rows } = await store.select<Club>({
    table: 'clubs',
    filters: [{ op: 'in', col: 'id', values: [...ids] }],
    order: [{ col: 'name', dir: 'asc' }],
  });
  return rows;
}

/** Clubs currently recruiting, for the homepage and the recruitment fair. */
export async function listRecruitingClubs(limit = 6): Promise<Club[]> {
  const store = await getStore();
  const { rows } = await store.select<Club>({
    table: 'clubs',
    filters: [
      { op: 'eq', col: 'status', value: 'PUBLISHED' },
      { op: 'eq', col: 'recruitmentStatus', value: 'OPEN' },
    ],
    order: [{ col: 'followerCount', dir: 'desc' }],
    limit,
  });
  return rows;
}

export async function listClubMembers(clubId: string): Promise<ClubMember[]> {
  const store = await getStore();
  const { rows } = await store.select<ClubMember>({
    table: 'club_members',
    filters: [{ op: 'eq', col: 'clubId', value: clubId }],
    order: [{ col: 'clubRole', dir: 'asc' }, { col: 'displayName', dir: 'asc' }],
  });
  return rows;
}

/** Category counts used by the directory filter chips. */
export async function clubCategoryCounts(): Promise<Record<string, number>> {
  const store = await getStore();
  const { rows } = await store.select<Club>({
    table: 'clubs',
    filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
  });
  const counts: Record<string, number> = {};
  for (const club of rows) counts[club.category] = (counts[club.category] ?? 0) + 1;
  return counts;
}
