'use server';

import { revalidatePath } from 'next/cache';
import { getStore } from '@/server/db';
import { requireUser } from '@/server/auth/session';
import { bookmarkSchema, type ActionResult } from '@/server/validation/schemas';
import {
  getRegistration, notify, toggleBookmark, toggleClubFollow,
} from '@/server/db/repositories/engagement';
import { getEventById } from '@/server/db/repositories/events';
import { getClubById } from '@/server/db/repositories/clubs';
import { trackSafe } from '@/server/db/repositories/analytics';
import { action, currentVisitorHash, limit } from './_shared';
import type { BookmarkType, CampusEvent, EventRegistration, Notification } from '@/types/domain';

/**
 * Engagement mutations.
 *
 * Each one is a real database write plus its downstream effects: a follow also
 * updates the club's follower counter and starts feeding that club's posts into
 * the user's ranked feed; a registration also decrements seats and schedules a
 * reminder notification.
 */

export async function toggleBookmarkAction(
  targetType: BookmarkType,
  targetId: string,
): Promise<ActionResult<{ bookmarked: boolean }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('content:write', user.id);
    const input = bookmarkSchema.parse({ targetType, targetId });

    const result = await toggleBookmark(user.id, input.targetType, input.targetId);

    await trackSafe({
      name: 'bookmark',
      path: `/${input.targetType.toLowerCase()}`,
      entityId: input.targetId,
      visitorHash: await currentVisitorHash(),
      meta: { type: input.targetType, on: result.bookmarked },
    });

    revalidatePath('/saved');
    revalidatePath('/dashboard');
    return result;
  });
}

export async function toggleClubFollowAction(clubId: string): Promise<ActionResult<{ following: boolean }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('content:write', user.id);

    const club = await getClubById(clubId);
    if (!club) throw new Error('That club no longer exists.');

    const result = await toggleClubFollow(user.id, clubId);

    await trackSafe({
      name: 'club_follow',
      path: `/clubs/${club.slug}`,
      entityId: clubId,
      visitorHash: await currentVisitorHash(),
      meta: { on: result.following },
    });

    revalidatePath(`/clubs/${club.slug}`);
    revalidatePath('/clubs');
    revalidatePath('/dashboard');
    return result;
  });
}

/**
 * Registers the current user for an event.
 *
 * Seat capacity is checked and the counter incremented in the same call. If the
 * event is full the registration is accepted as WAITLISTED rather than rejected,
 * which is what students expect and avoids a lost click.
 */
export async function registerForEventAction(
  eventId: string,
): Promise<ActionResult<{ status: EventRegistration['status'] }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('content:write', user.id);

    const event = await getEventById(eventId);
    if (!event) throw new Error('That event no longer exists.');
    if (event.status !== 'PUBLISHED') throw new Error('That event is not open for registration.');
    if (Date.parse(event.endsAt) < Date.now()) throw new Error('That event has already finished.');
    if (event.registrationDeadline && Date.parse(event.registrationDeadline) < Date.now()) {
      throw new Error('Registration for this event has closed.');
    }

    const store = await getStore();
    const existing = await getRegistration(user.id, eventId);
    const now = new Date().toISOString();

    if (existing && existing.status !== 'CANCELLED') {
      return { status: existing.status };
    }

    const full = event.seats !== null && event.seatsTaken >= event.seats;
    const status: EventRegistration['status'] = full ? 'WAITLISTED' : 'REGISTERED';

    if (existing) {
      await store.update<EventRegistration>('event_registrations', existing.id, { status, updatedAt: now });
    } else {
      await store.insert<EventRegistration>('event_registrations', {
        eventId,
        userId: user.id,
        status,
        note: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (status === 'REGISTERED') {
      await store.increment('events', eventId, 'seatsTaken', 1);
      await notify([
        {
          userId: user.id,
          type: 'EVENT_REMINDER',
          title: `You are registered for ${event.title}`,
          body: `${event.venue} · starts ${new Date(event.startsAt).toISOString().slice(0, 16).replace('T', ' ')}`,
          href: `/events/${event.slug}`,
        },
      ]);
    }

    await trackSafe({
      name: 'event_register_click',
      path: `/events/${event.slug}`,
      entityId: eventId,
      visitorHash: await currentVisitorHash(),
      meta: { status },
    });

    revalidatePath(`/events/${event.slug}`);
    revalidatePath('/dashboard');
    return { status };
  });
}

export async function cancelRegistrationAction(eventId: string): Promise<ActionResult<{ cancelled: boolean }>> {
  return action(async () => {
    const user = await requireUser();
    const registration = await getRegistration(user.id, eventId);
    if (!registration || registration.status === 'CANCELLED') return { cancelled: true };

    const store = await getStore();
    await store.update<EventRegistration>('event_registrations', registration.id, {
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    });
    if (registration.status === 'REGISTERED') {
      await store.increment('events', eventId, 'seatsTaken', -1);
    }

    const event = await getEventById(eventId);
    if (event) revalidatePath(`/events/${event.slug}`);
    revalidatePath('/dashboard');
    return { cancelled: true };
  });
}

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult<{ read: boolean }>> {
  return action(async () => {
    const user = await requireUser();
    const store = await getStore();

    // Scope the lookup to the caller so one user cannot mark another's read.
    const notification = await store.selectOne<Notification>({
      table: 'notifications',
      filters: [
        { op: 'eq', col: 'id', value: notificationId },
        { op: 'eq', col: 'userId', value: user.id },
      ],
    });
    if (!notification) throw new Error('That notification no longer exists.');
    if (notification.readAt) return { read: true };

    await store.update<Notification>('notifications', notification.id, { readAt: new Date().toISOString() });
    revalidatePath('/notifications');
    return { read: true };
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<{ count: number }>> {
  return action(async () => {
    const user = await requireUser();
    const store = await getStore();
    const count = await store.updateWhere(
      'notifications',
      [
        { op: 'eq', col: 'userId', value: user.id },
        { op: 'is', col: 'readAt', value: null },
      ],
      { readAt: new Date().toISOString() },
    );
    revalidatePath('/notifications');
    revalidatePath('/', 'layout');
    return { count };
  });
}

/** Records an outbound click on an event's external registration link. */
export async function trackRegistrationClick(event: Pick<CampusEvent, 'id' | 'slug'>): Promise<void> {
  await trackSafe({
    name: 'event_register_click',
    path: `/events/${event.slug}`,
    entityId: event.id,
    visitorHash: await currentVisitorHash(),
    meta: { external: true },
  });
}
