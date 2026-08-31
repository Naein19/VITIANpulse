import 'server-only';
import { getStore } from '@/server/db';
import { scoreFields } from '@/lib/fuzzy';
import type {
  CampusEvent, Club, Opportunity, Post, PyqSubject, Resource, SearchEntity, SearchHit,
} from '@/types/domain';

/**
 * Global search.
 *
 * Fetches a bounded candidate set per entity (filtered server-side where the
 * store can help) and scores it with the fuzzy matcher. This is deliberately not
 * Postgres full-text: the corpus is small, ranking needs to stay identical
 * across both store adapters, and fuzzy/initialism matching is what students
 * actually type ("dbms cat2", "cn", "ecell"). The `searchAll` signature is the
 * seam a Postgres `tsvector` or an external index would slot into.
 */

const CANDIDATE_LIMIT = 400;

export interface SearchOptions {
  entities?: readonly SearchEntity[];
  limitPerEntity?: number;
}

export async function searchAll(rawQuery: string, options: SearchOptions = {}): Promise<SearchHit[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const wanted = new Set<SearchEntity>(
    options.entities ?? ['post', 'event', 'club', 'pyq', 'opportunity', 'resource'],
  );
  const limitPerEntity = options.limitPerEntity ?? 8;
  const store = await getStore();

  const [posts, events, clubs, subjects, opportunities, resources] = await Promise.all([
    wanted.has('post')
      ? store.select<Post>({
          table: 'posts',
          filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
          order: [{ col: 'publishedAt', dir: 'desc' }],
          limit: CANDIDATE_LIMIT,
        })
      : empty<Post>(),
    wanted.has('event')
      ? store.select<CampusEvent>({
          table: 'events',
          filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
          order: [{ col: 'startsAt', dir: 'desc' }],
          limit: CANDIDATE_LIMIT,
        })
      : empty<CampusEvent>(),
    wanted.has('club')
      ? store.select<Club>({
          table: 'clubs',
          filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
          limit: CANDIDATE_LIMIT,
        })
      : empty<Club>(),
    wanted.has('pyq') ? store.select<PyqSubject>({ table: 'pyq_subjects', limit: CANDIDATE_LIMIT }) : empty<PyqSubject>(),
    wanted.has('opportunity')
      ? store.select<Opportunity>({
          table: 'opportunities',
          filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
          limit: CANDIDATE_LIMIT,
        })
      : empty<Opportunity>(),
    wanted.has('resource')
      ? store.select<Resource>({
          table: 'resources',
          filters: [{ op: 'eq', col: 'status', value: 'PUBLISHED' }],
          limit: CANDIDATE_LIMIT,
        })
      : empty<Resource>(),
  ]);

  const hits: SearchHit[] = [];

  for (const post of posts.rows) {
    const score = scoreFields(query, [
      { value: post.title, weight: 1 },
      { value: post.summary, weight: 0.6 },
      { value: post.tags.join(' '), weight: 0.5 },
      { value: post.category, weight: 0.4 },
    ]);
    if (score > 0) {
      hits.push({
        entity: 'post',
        id: post.id,
        title: post.title,
        subtitle: post.summary,
        href: `/news/${post.slug}`,
        badge: post.category,
        score,
      });
    }
  }

  for (const event of events.rows) {
    const score = scoreFields(query, [
      { value: event.title, weight: 1 },
      { value: event.summary, weight: 0.6 },
      { value: event.organiser, weight: 0.55 },
      { value: event.venue, weight: 0.4 },
      { value: event.tags.join(' '), weight: 0.5 },
    ]);
    if (score > 0) {
      hits.push({
        entity: 'event',
        id: event.id,
        title: event.title,
        subtitle: `${event.organiser} · ${event.venue}`,
        href: `/events/${event.slug}`,
        badge: event.category,
        score,
      });
    }
  }

  for (const club of clubs.rows) {
    const score = scoreFields(query, [
      { value: club.name, weight: 1 },
      { value: club.shortName, weight: 0.9 },
      { value: club.tagline, weight: 0.5 },
      { value: club.category, weight: 0.4 },
    ]);
    if (score > 0) {
      hits.push({
        entity: 'club',
        id: club.id,
        title: club.name,
        subtitle: club.tagline,
        href: `/clubs/${club.slug}`,
        badge: club.category,
        score,
      });
    }
  }

  for (const subject of subjects.rows) {
    const score = scoreFields(query, [
      { value: subject.code, weight: 1 },
      { value: subject.name, weight: 0.95 },
      { value: `${subject.branch} semester ${subject.semester}`, weight: 0.4 },
    ]);
    if (score > 0) {
      hits.push({
        entity: 'pyq',
        id: subject.id,
        title: `${subject.code} — ${subject.name}`,
        subtitle: `${subject.branch} · Semester ${subject.semester} · ${subject.paperCount} papers`,
        href: `/pyqs/${subject.branch.toLowerCase()}?subject=${encodeURIComponent(subject.code)}`,
        badge: 'PYQ',
        score,
      });
    }
  }

  for (const opp of opportunities.rows) {
    const score = scoreFields(query, [
      { value: opp.title, weight: 1 },
      { value: opp.organisation, weight: 0.7 },
      { value: opp.summary, weight: 0.5 },
      { value: opp.tags.join(' '), weight: 0.45 },
    ]);
    if (score > 0) {
      hits.push({
        entity: 'opportunity',
        id: opp.id,
        title: opp.title,
        subtitle: `${opp.organisation} · ${opp.location}`,
        href: `/opportunities/${opp.slug}`,
        badge: opp.type,
        score,
      });
    }
  }

  for (const resource of resources.rows) {
    const score = scoreFields(query, [
      { value: resource.title, weight: 1 },
      { value: resource.description, weight: 0.5 },
      { value: resource.tags.join(' '), weight: 0.45 },
    ]);
    if (score > 0) {
      hits.push({
        entity: 'resource',
        id: resource.id,
        title: resource.title,
        subtitle: resource.description,
        href: `/resources#${resource.slug}`,
        badge: resource.category.replace(/_/g, ' '),
        score,
      });
    }
  }

  // Cap per entity so one type cannot crowd out the rest, then sort globally.
  const perEntity = new Map<SearchEntity, number>();
  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .filter((hit) => {
      const used = perEntity.get(hit.entity) ?? 0;
      if (used >= limitPerEntity) return false;
      perEntity.set(hit.entity, used + 1);
      return true;
    });
}

function empty<T>(): Promise<{ rows: T[]; total: number }> {
  return Promise.resolve({ rows: [], total: 0 });
}

export function groupHits(hits: readonly SearchHit[]): Record<SearchEntity, SearchHit[]> {
  const out: Record<SearchEntity, SearchHit[]> = {
    post: [], event: [], club: [], pyq: [], opportunity: [], resource: [],
  };
  for (const hit of hits) out[hit.entity].push(hit);
  return out;
}
