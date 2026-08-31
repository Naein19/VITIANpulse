import 'server-only';
import { getStore, getPrivilegedStore, type Filter } from '@/server/db';
import type {
  Bookmark, BookmarkType, ClubFollow, EventRegistration, Notification, NotificationType,
} from '@/types/domain';

/** Bookmarks, club follows, event registrations and notifications. */

/* ------------------------------------------------------------- bookmarks */

export async function listBookmarks(userId: string, type?: BookmarkType): Promise<Bookmark[]> {
  const store = await getStore();
  const filters: Filter[] = [{ op: 'eq', col: 'userId', value: userId }];
  if (type) filters.push({ op: 'eq', col: 'targetType', value: type });
  const { rows } = await store.select<Bookmark>({
    table: 'bookmarks',
    filters,
    order: [{ col: 'createdAt', dir: 'desc' }],
  });
  return rows;
}

/** Bookmark ids for one entity type, as a set for O(1) `isBookmarked` checks. */
export async function bookmarkedIds(userId: string | null, type: BookmarkType): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await listBookmarks(userId, type);
  return new Set(rows.map((b) => b.targetId));
}

export async function isBookmarked(userId: string, type: BookmarkType, targetId: string): Promise<boolean> {
  const store = await getStore();
  const row = await store.selectOne<Bookmark>({
    table: 'bookmarks',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'eq', col: 'targetType', value: type },
      { op: 'eq', col: 'targetId', value: targetId },
    ],
  });
  return row !== null;
}

/** Idempotent toggle. Returns the resulting state. */
export async function toggleBookmark(
  userId: string,
  type: BookmarkType,
  targetId: string,
): Promise<{ bookmarked: boolean }> {
  const store = await getStore();
  const existing = await store.selectOne<Bookmark>({
    table: 'bookmarks',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'eq', col: 'targetType', value: type },
      { op: 'eq', col: 'targetId', value: targetId },
    ],
  });
  if (existing) {
    await store.delete('bookmarks', existing.id);
    return { bookmarked: false };
  }
  await store.insert<Bookmark>('bookmarks', {
    userId,
    targetType: type,
    targetId,
    createdAt: new Date().toISOString(),
  });
  return { bookmarked: true };
}

export async function countBookmarksByType(userId: string): Promise<Record<BookmarkType, number>> {
  const rows = await listBookmarks(userId);
  const counts = {
    POST: 0, EVENT: 0, CLUB: 0, PYQ: 0, OPPORTUNITY: 0, RESOURCE: 0,
  } satisfies Record<BookmarkType, number>;
  for (const row of rows) counts[row.targetType] += 1;
  return counts;
}

/* ----------------------------------------------------------- club follows */

export async function listFollowedClubIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const store = await getStore();
  const { rows } = await store.select<ClubFollow>({
    table: 'club_follows',
    filters: [{ op: 'eq', col: 'userId', value: userId }],
  });
  return rows.map((r) => r.clubId);
}

export async function isFollowingClub(userId: string, clubId: string): Promise<boolean> {
  const store = await getStore();
  const row = await store.selectOne<ClubFollow>({
    table: 'club_follows',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'eq', col: 'clubId', value: clubId },
    ],
  });
  return row !== null;
}

/**
 * Follow/unfollow, keeping the denormalised `followerCount` in step.
 * The counter is bumped through the store's `increment`, which is a single SQL
 * statement on Supabase rather than a read-modify-write.
 */
export async function toggleClubFollow(userId: string, clubId: string): Promise<{ following: boolean }> {
  const store = await getStore();
  const existing = await store.selectOne<ClubFollow>({
    table: 'club_follows',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'eq', col: 'clubId', value: clubId },
    ],
  });

  if (existing) {
    await store.delete('club_follows', existing.id);
    await store.increment('clubs', clubId, 'followerCount', -1);
    return { following: false };
  }

  await store.insert<ClubFollow>('club_follows', {
    userId,
    clubId,
    createdAt: new Date().toISOString(),
  });
  await store.increment('clubs', clubId, 'followerCount', 1);
  return { following: true };
}

export async function countClubFollowers(clubId: string): Promise<number> {
  const store = await getStore();
  const { total } = await store.select({
    table: 'club_follows',
    filters: [{ op: 'eq', col: 'clubId', value: clubId }],
    limit: 1,
  });
  return total;
}

/* ---------------------------------------------------------- registrations */

export async function listRegistrations(userId: string): Promise<EventRegistration[]> {
  const store = await getStore();
  const { rows } = await store.select<EventRegistration>({
    table: 'event_registrations',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'neq', col: 'status', value: 'CANCELLED' },
    ],
    order: [{ col: 'createdAt', dir: 'desc' }],
  });
  return rows;
}

export async function getRegistration(userId: string, eventId: string): Promise<EventRegistration | null> {
  const store = await getStore();
  return store.selectOne<EventRegistration>({
    table: 'event_registrations',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'eq', col: 'eventId', value: eventId },
    ],
  });
}

/* ---------------------------------------------------------- notifications */

export async function listNotifications(userId: string, limit = 40): Promise<Notification[]> {
  const store = await getStore();
  const { rows } = await store.select<Notification>({
    table: 'notifications',
    filters: [{ op: 'eq', col: 'userId', value: userId }],
    order: [{ col: 'createdAt', dir: 'desc' }],
    limit,
  });
  return rows;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const store = await getStore();
  const { total } = await store.select({
    table: 'notifications',
    filters: [
      { op: 'eq', col: 'userId', value: userId },
      { op: 'is', col: 'readAt', value: null },
    ],
    limit: 1,
  });
  return total;
}

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
}

/**
 * Creates notifications, honouring each recipient's preferences and skipping
 * exact duplicates raised in the last twelve hours. Uses the privileged store
 * because a notification is written *for* another user, which RLS forbids the
 * acting user from doing directly.
 */
export async function notify(inputs: readonly NotifyInput[]): Promise<number> {
  if (inputs.length === 0) return 0;
  const store = await getPrivilegedStore();
  const now = Date.now();
  const cutoff = new Date(now - 12 * 3_600_000).toISOString();

  const userIds = [...new Set(inputs.map((i) => i.userId))];
  const [{ rows: prefs }, { rows: recent }] = await Promise.all([
    store.select<{ id: string; userId: string; type: NotificationType; enabled: boolean }>({
      table: 'notification_prefs',
      filters: [{ op: 'in', col: 'userId', values: userIds }],
    }),
    store.select<Notification>({
      table: 'notifications',
      filters: [
        { op: 'in', col: 'userId', values: userIds },
        { op: 'gte', col: 'createdAt', value: cutoff },
      ],
    }),
  ]);

  const disabled = new Set(prefs.filter((p) => !p.enabled).map((p) => `${p.userId}:${p.type}`));
  const seen = new Set(recent.map((n) => `${n.userId}:${n.type}:${n.title}`));

  const toCreate = inputs.filter((input) => {
    const prefKey = `${input.userId}:${input.type}`;
    const dupeKey = `${input.userId}:${input.type}:${input.title}`;
    if (disabled.has(prefKey) || seen.has(dupeKey)) return false;
    seen.add(dupeKey);
    return true;
  });

  if (toCreate.length === 0) return 0;

  await store.insertMany<Notification>(
    'notifications',
    toCreate.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      readAt: null,
      createdAt: new Date(now).toISOString(),
    })),
  );
  return toCreate.length;
}

/** Everyone following a club — the audience for a club update notification. */
export async function followersOfClub(clubId: string): Promise<string[]> {
  const store = await getPrivilegedStore();
  const { rows } = await store.select<ClubFollow>({
    table: 'club_follows',
    filters: [{ op: 'eq', col: 'clubId', value: clubId }],
  });
  return rows.map((r) => r.userId);
}

export async function notificationPreferences(userId: string): Promise<Record<string, boolean>> {
  const store = await getStore();
  const { rows } = await store.select<{ id: string; type: string; enabled: boolean }>({
    table: 'notification_prefs',
    filters: [{ op: 'eq', col: 'userId', value: userId }],
  });
  const out: Record<string, boolean> = {};
  for (const row of rows) out[row.type] = row.enabled;
  return out;
}
