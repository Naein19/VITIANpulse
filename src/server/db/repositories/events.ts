import 'server-only';
import { getStore, type Filter, type OrderBy } from '@/server/db';
import type {
  CampusEvent, CampusLocation, Club, EventCategory, EventWithRelations, Paginated, School,
} from '@/types/domain';
import { rankBy, scoreEvent, type RankingContext } from '@/lib/ranking';
import { toClubSummary } from './posts';

/** Read/write access to campus events. */

export type EventWindow = 'upcoming' | 'past' | 'today' | 'week' | 'all';

export interface EventQuery {
  category?: EventCategory | 'ALL';
  clubId?: string;
  school?: School;
  window?: EventWindow;
  search?: string;
  tag?: string;
  free?: boolean;
  registrationRequired?: boolean;
  status?: CampusEvent['status'] | 'ALL';
  /** Inclusive ISO date bounds on `startsAt`. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  rankFor?: RankingContext;
  featuredOnly?: boolean;
}

export async function hydrateEvents(events: readonly CampusEvent[]): Promise<EventWithRelations[]> {
  if (events.length === 0) return [];
  const store = await getStore();

  const clubIds = [...new Set(events.map((e) => e.clubId).filter((id): id is string => Boolean(id)))];
  const locationIds = [...new Set(events.map((e) => e.locationId).filter((id): id is string => Boolean(id)))];

  const [clubs, locations] = await Promise.all([
    clubIds.length
      ? store.select<Club>({ table: 'clubs', filters: [{ op: 'in', col: 'id', values: clubIds }] })
      : Promise.resolve({ rows: [] as Club[], total: 0 }),
    locationIds.length
      ? store.select<CampusLocation>({
          table: 'campus_locations',
          filters: [{ op: 'in', col: 'id', values: locationIds }],
        })
      : Promise.resolve({ rows: [] as CampusLocation[], total: 0 }),
  ]);

  const clubById = new Map(clubs.rows.map((c) => [c.id, toClubSummary(c)]));
  const locationById = new Map(locations.rows.map((l) => [l.id, l]));

  return events.map((event) => ({
    ...event,
    club: event.clubId ? (clubById.get(event.clubId) ?? null) : null,
    location: event.locationId ? (locationById.get(event.locationId) ?? null) : null,
  }));
}

function windowFilters(window: EventWindow | undefined, now = new Date()): Filter[] {
  const iso = now.toISOString();
  switch (window) {
    case 'past':
      return [{ op: 'lt', col: 'endsAt', value: iso }];
    case 'today': {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return [
        { op: 'lte', col: 'startsAt', value: end.toISOString() },
        { op: 'gte', col: 'endsAt', value: iso },
      ];
    }
    case 'week': {
      const end = new Date(now.getTime() + 7 * 86_400_000);
      return [
        { op: 'lte', col: 'startsAt', value: end.toISOString() },
        { op: 'gte', col: 'endsAt', value: iso },
      ];
    }
    case 'all':
      return [];
    case 'upcoming':
    default:
      return [{ op: 'gte', col: 'endsAt', value: iso }];
  }
}

function buildFilters(query: EventQuery): Filter[] {
  const filters: Filter[] = [];
  const status = query.status ?? 'PUBLISHED';
  if (status !== 'ALL') filters.push({ op: 'eq', col: 'status', value: status });
  filters.push(...windowFilters(query.window));
  if (query.category && query.category !== 'ALL') filters.push({ op: 'eq', col: 'category', value: query.category });
  if (query.clubId) filters.push({ op: 'eq', col: 'clubId', value: query.clubId });
  if (query.school) filters.push({ op: 'eq', col: 'school', value: query.school });
  if (query.tag) filters.push({ op: 'contains', col: 'tags', values: [query.tag] });
  if (query.free === true) filters.push({ op: 'eq', col: 'isPaid', value: false });
  if (query.free === false) filters.push({ op: 'eq', col: 'isPaid', value: true });
  if (query.registrationRequired !== undefined) {
    filters.push({ op: 'eq', col: 'registrationRequired', value: query.registrationRequired });
  }
  if (query.featuredOnly) filters.push({ op: 'eq', col: 'featured', value: true });
  if (query.from) filters.push({ op: 'gte', col: 'startsAt', value: query.from });
  if (query.to) filters.push({ op: 'lte', col: 'startsAt', value: query.to });
  if (query.search) {
    filters.push({
      op: 'or',
      filters: [
        { op: 'ilike', col: 'title', value: query.search },
        { op: 'ilike', col: 'summary', value: query.search },
        { op: 'ilike', col: 'venue', value: query.search },
        { op: 'ilike', col: 'organiser', value: query.search },
      ],
    });
  }
  return filters;
}

function orderFor(window: EventWindow | undefined): OrderBy[] {
  return window === 'past'
    ? [{ col: 'startsAt', dir: 'desc' }]
    : [{ col: 'startsAt', dir: 'asc' }];
}

export async function listEvents(query: EventQuery = {}): Promise<Paginated<EventWithRelations>> {
  const store = await getStore();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, query.pageSize ?? 12));
  const filters = buildFilters(query);
  const order = orderFor(query.window);

  if (query.rankFor) {
    const { rows, total } = await store.select<CampusEvent>({ table: 'events', filters, order, limit: 150 });
    const hydrated = await hydrateEvents(rows);
    const ranked = rankBy(hydrated, (e) => scoreEvent(e, query.rankFor!), (e) => -Date.parse(e.startsAt));
    const start = (page - 1) * pageSize;
    const items = ranked.slice(start, start + pageSize);
    return { items, total, page, pageSize, hasMore: start + items.length < ranked.length };
  }

  const { rows, total } = await store.select<CampusEvent>({
    table: 'events',
    filters,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const items = await hydrateEvents(rows);
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getEventBySlug(slug: string): Promise<EventWithRelations | null> {
  const store = await getStore();
  const event = await store.selectOne<CampusEvent>({
    table: 'events',
    filters: [{ op: 'eq', col: 'slug', value: slug }],
  });
  if (!event) return null;
  const [hydrated] = await hydrateEvents([event]);
  return hydrated ?? null;
}

export async function getEventById(id: string): Promise<EventWithRelations | null> {
  const store = await getStore();
  const event = await store.selectOne<CampusEvent>({ table: 'events', filters: [{ op: 'eq', col: 'id', value: id }] });
  if (!event) return null;
  const [hydrated] = await hydrateEvents([event]);
  return hydrated ?? null;
}

export async function getEventsByIds(ids: readonly string[]): Promise<EventWithRelations[]> {
  if (ids.length === 0) return [];
  const store = await getStore();
  const { rows } = await store.select<CampusEvent>({
    table: 'events',
    filters: [{ op: 'in', col: 'id', values: [...ids] }],
  });
  return hydrateEvents(rows);
}

/** Events that overlap today, used by the homepage command centre. */
export async function listTodayEvents(limit = 6): Promise<EventWithRelations[]> {
  const { items } = await listEvents({ window: 'today', pageSize: limit });
  return items;
}

/** Everything in a calendar month, for the events calendar view. */
export async function listEventsInMonth(year: number, month: number): Promise<EventWithRelations[]> {
  const from = new Date(Date.UTC(year, month, 1)).toISOString();
  const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();
  const { items } = await listEvents({ window: 'all', from, to, pageSize: 60 });
  return items;
}

export async function incrementEventView(id: string): Promise<void> {
  const store = await getStore();
  await store.increment('events', id, 'viewCount');
}

/** Registration count for an event, used to render remaining seats. */
export async function countRegistrations(eventId: string): Promise<number> {
  const store = await getStore();
  const { total } = await store.select({
    table: 'event_registrations',
    filters: [
      { op: 'eq', col: 'eventId', value: eventId },
      { op: 'in', col: 'status', values: ['REGISTERED', 'ATTENDED'] },
    ],
    limit: 1,
  });
  return total;
}
