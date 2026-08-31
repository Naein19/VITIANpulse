'use server';

import { revalidatePath } from 'next/cache';
import { getStore } from '@/server/db';
import { requireUser, requirePermission } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { AuthorizationError } from '@/server/auth/rbac';
import {
  eventSchema, opportunitySchema, postSchema, resourceSchema, uuid, type ActionResult,
} from '@/server/validation/schemas';
import { uniqueSlug } from '@/lib/sanitize';
import { audit } from '@/server/db/repositories/admin';
import { followersOfClub, notify } from '@/server/db/repositories/engagement';
import { getPostById } from '@/server/db/repositories/posts';
import { getEventById } from '@/server/db/repositories/events';
import { getClubById } from '@/server/db/repositories/clubs';
import { action, asArray, formToObject, limit, withBooleans } from './_shared';
import type {
  CampusEvent, ContentStatus, Opportunity, Post, Resource,
} from '@/types/domain';

/**
 * Editorial content mutations: posts, events, opportunities and resources.
 *
 * Authorisation model per entity:
 *  - creating requires `<entity>:create`
 *  - editing requires `<entity>:edit:any`, OR `:edit:own` plus authorship or
 *    administration of the owning club
 *  - moving anything into PUBLISHED requires `<entity>:publish`; a club admin
 *    can only reach PENDING_REVIEW, which is what makes the review queue real.
 */

async function takenSlugs(table: 'posts' | 'events' | 'opportunities' | 'resources'): Promise<Set<string>> {
  const store = await getStore();
  const { rows } = await store.select<{ id: string; slug: string }>({ table, limit: 5_000 });
  return new Set(rows.map((r) => r.slug));
}

/** A club admin may submit for review but never self-publish. */
function resolveStatus(requested: ContentStatus, canPublish: boolean): ContentStatus {
  if (requested === 'PUBLISHED' && !canPublish) return 'PENDING_REVIEW';
  return requested;
}

/* ------------------------------------------------------------------ posts */

export async function savePostAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ slug: string }>> {
  return action(async () => {
    const user = await requirePermission('post:create');
    await limit('content:write', user.id);

    const id = formData.get('id') ? uuid.parse(formData.get('id')) : null;
    const raw = withBooleans(formToObject(formData), ['pinned']);
    const input = postSchema.parse(raw);

    // A club admin may only file content under a club they administer.
    if (input.clubId && !can(user.role, 'post:edit:any') && !user.adminClubIds.includes(input.clubId)) {
      throw new AuthorizationError('post:edit:any');
    }

    const canPublish = can(user.role, 'post:publish');
    const status = resolveStatus(input.status, canPublish);
    const store = await getStore();
    const now = new Date().toISOString();

    if (id) {
      const existing = await getPostById(id);
      if (!existing) throw new Error('That post no longer exists.');

      const owns =
        existing.authorId === user.id ||
        (existing.clubId !== null && user.adminClubIds.includes(existing.clubId));
      if (!can(user.role, 'post:edit:any') && !owns) throw new AuthorizationError('post:edit:any');

      const wasPublished = existing.status === 'PUBLISHED';
      await store.update<Post>('posts', id, {
        ...input,
        status,
        publishedAt: status === 'PUBLISHED' ? (existing.publishedAt ?? now) : existing.publishedAt,
        updatedAt: now,
      });

      await audit({
        actorId: user.id, actorName: user.displayName, action: 'POST_UPDATED',
        entityType: 'post', entityId: id, detail: `status=${status}`,
      });

      if (!wasPublished && status === 'PUBLISHED' && input.clubId) {
        await notifyClubFollowers(input.clubId, existing.title, `/news/${existing.slug}`);
      }

      revalidatePath('/news');
      revalidatePath(`/news/${existing.slug}`);
      revalidatePath('/');
      return { slug: existing.slug };
    }

    const slug = uniqueSlug(input.title, await takenSlugs('posts'));
    const created = await store.insert<Post>('posts', {
      ...input,
      slug,
      status,
      authorId: user.id,
      viewCount: 0,
      reactionCount: 0,
      commentCount: 0,
      publishedAt: status === 'PUBLISHED' ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'POST_CREATED',
      entityType: 'post', entityId: created.id, detail: `status=${status}`,
    });

    if (status === 'PUBLISHED' && input.clubId) {
      await notifyClubFollowers(input.clubId, input.title, `/news/${slug}`);
    }

    revalidatePath('/news');
    revalidatePath('/');
    return { slug };
  });
}

export async function transitionPostStatusAction(
  postId: string,
  status: ContentStatus,
): Promise<ActionResult<{ status: ContentStatus }>> {
  return action(async () => {
    const user = await requirePermission('post:publish');
    const post = await getPostById(uuid.parse(postId));
    if (!post) throw new Error('That post no longer exists.');

    const store = await getStore();
    const now = new Date().toISOString();
    await store.update<Post>('posts', post.id, {
      status,
      publishedAt: status === 'PUBLISHED' ? (post.publishedAt ?? now) : post.publishedAt,
      updatedAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: `POST_${status}`,
      entityType: 'post', entityId: post.id,
    });

    if (status === 'PUBLISHED' && post.clubId) {
      await notifyClubFollowers(post.clubId, post.title, `/news/${post.slug}`);
    }

    revalidatePath('/admin/posts');
    revalidatePath('/news');
    revalidatePath('/');
    return { status };
  });
}

export async function deletePostAction(postId: string): Promise<ActionResult<{ deleted: true }>> {
  return action(async () => {
    const user = await requirePermission('post:delete');
    const post = await getPostById(uuid.parse(postId));
    if (!post) return { deleted: true as const };

    const store = await getStore();
    await store.delete('posts', post.id);
    await audit({
      actorId: user.id, actorName: user.displayName, action: 'POST_DELETED',
      entityType: 'post', entityId: post.id, detail: post.title.slice(0, 80),
    });

    revalidatePath('/admin/posts');
    revalidatePath('/news');
    return { deleted: true as const };
  });
}

/* ----------------------------------------------------------------- events */

export async function saveEventAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ slug: string }>> {
  return action(async () => {
    const user = await requirePermission('event:create');
    await limit('content:write', user.id);

    const id = formData.get('id') ? uuid.parse(formData.get('id')) : null;
    const raw = withBooleans(formToObject(formData), ['registrationRequired', 'isPaid', 'featured']);
    const input = eventSchema.parse(raw);

    if (input.clubId && !can(user.role, 'event:edit:any') && !user.adminClubIds.includes(input.clubId)) {
      throw new AuthorizationError('event:edit:any');
    }

    const canPublish = can(user.role, 'event:publish');
    const status = resolveStatus(input.status, canPublish);
    const store = await getStore();
    const now = new Date().toISOString();

    if (id) {
      const existing = await getEventById(id);
      if (!existing) throw new Error('That event no longer exists.');
      const owns =
        existing.createdBy === user.id ||
        (existing.clubId !== null && user.adminClubIds.includes(existing.clubId));
      if (!can(user.role, 'event:edit:any') && !owns) throw new AuthorizationError('event:edit:any');

      const wasPublished = existing.status === 'PUBLISHED';
      await store.update<CampusEvent>('events', id, {
        ...input,
        status,
        publishedAt: status === 'PUBLISHED' ? (existing.publishedAt ?? now) : existing.publishedAt,
        updatedAt: now,
      });

      await audit({
        actorId: user.id, actorName: user.displayName, action: 'EVENT_UPDATED',
        entityType: 'event', entityId: id, detail: `status=${status}`,
      });

      if (!wasPublished && status === 'PUBLISHED' && input.clubId) {
        await notifyClubFollowers(input.clubId, input.title, `/events/${existing.slug}`, 'A new event');
      }

      revalidatePath('/events');
      revalidatePath(`/events/${existing.slug}`);
      return { slug: existing.slug };
    }

    const slug = uniqueSlug(input.title, await takenSlugs('events'));
    const created = await store.insert<CampusEvent>('events', {
      ...input,
      slug,
      status,
      seatsTaken: 0,
      createdBy: user.id,
      viewCount: 0,
      publishedAt: status === 'PUBLISHED' ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'EVENT_CREATED',
      entityType: 'event', entityId: created.id, detail: `status=${status}`,
    });

    if (status === 'PUBLISHED' && input.clubId) {
      await notifyClubFollowers(input.clubId, input.title, `/events/${slug}`, 'A new event');
    }

    revalidatePath('/events');
    revalidatePath('/');
    return { slug };
  });
}

export async function transitionEventStatusAction(
  eventId: string,
  status: ContentStatus,
): Promise<ActionResult<{ status: ContentStatus }>> {
  return action(async () => {
    const user = await requirePermission('event:publish');
    const event = await getEventById(uuid.parse(eventId));
    if (!event) throw new Error('That event no longer exists.');

    const store = await getStore();
    const now = new Date().toISOString();
    await store.update<CampusEvent>('events', event.id, {
      status,
      publishedAt: status === 'PUBLISHED' ? (event.publishedAt ?? now) : event.publishedAt,
      updatedAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: `EVENT_${status}`,
      entityType: 'event', entityId: event.id,
    });

    if (status === 'PUBLISHED' && event.clubId) {
      await notifyClubFollowers(event.clubId, event.title, `/events/${event.slug}`, 'A new event');
    }

    revalidatePath('/admin/events');
    revalidatePath('/events');
    return { status };
  });
}

export async function deleteEventAction(eventId: string): Promise<ActionResult<{ deleted: true }>> {
  return action(async () => {
    const user = await requirePermission('event:delete');
    const event = await getEventById(uuid.parse(eventId));
    if (!event) return { deleted: true as const };

    const store = await getStore();
    await store.deleteWhere('event_registrations', [{ op: 'eq', col: 'eventId', value: event.id }]);
    await store.delete('events', event.id);

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'EVENT_DELETED',
      entityType: 'event', entityId: event.id, detail: event.title.slice(0, 80),
    });

    revalidatePath('/admin/events');
    revalidatePath('/events');
    return { deleted: true as const };
  });
}

/* ---------------------------------------------------------- opportunities */

export async function saveOpportunityAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  return action(async () => {
    const user = await requirePermission('opportunity:manage');
    await limit('content:write', user.id);

    const id = formData.get('id') ? uuid.parse(formData.get('id')) : null;
    const raw = withBooleans(formToObject(formData), ['remote']);
    const input = opportunitySchema.parse({
      ...raw,
      branches: asArray(raw.branches),
      years: asArray(raw.years),
    });

    const store = await getStore();
    const now = new Date().toISOString();

    if (id) {
      const existing = await store.selectOne<Opportunity>({
        table: 'opportunities',
        filters: [{ op: 'eq', col: 'id', value: id }],
      });
      if (!existing) throw new Error('That opportunity no longer exists.');
      await store.update<Opportunity>('opportunities', id, {
        ...input,
        publishedAt: input.status === 'PUBLISHED' ? (existing.publishedAt ?? now) : existing.publishedAt,
        updatedAt: now,
      });
      await audit({
        actorId: user.id, actorName: user.displayName, action: 'OPPORTUNITY_UPDATED',
        entityType: 'opportunity', entityId: id,
      });
      revalidatePath('/opportunities');
      revalidatePath(`/opportunities/${existing.slug}`);
      return { slug: existing.slug };
    }

    const slug = uniqueSlug(`${input.title} ${input.organisation}`, await takenSlugs('opportunities'));
    const created = await store.insert<Opportunity>('opportunities', {
      ...input,
      slug,
      createdBy: user.id,
      viewCount: 0,
      clickCount: 0,
      publishedAt: input.status === 'PUBLISHED' ? now : null,
      createdAt: now,
      updatedAt: now,
    });
    await audit({
      actorId: user.id, actorName: user.displayName, action: 'OPPORTUNITY_CREATED',
      entityType: 'opportunity', entityId: created.id,
    });
    revalidatePath('/opportunities');
    return { slug };
  });
}

export async function deleteOpportunityAction(id: string): Promise<ActionResult<{ deleted: true }>> {
  return action(async () => {
    const user = await requirePermission('opportunity:manage');
    const store = await getStore();
    await store.delete('opportunities', uuid.parse(id));
    await audit({
      actorId: user.id, actorName: user.displayName, action: 'OPPORTUNITY_DELETED',
      entityType: 'opportunity', entityId: id,
    });
    revalidatePath('/opportunities');
    return { deleted: true as const };
  });
}

/* -------------------------------------------------------------- resources */

export async function saveResourceAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const user = await requirePermission('resource:manage');
    await limit('content:write', user.id);

    const id = formData.get('id') ? uuid.parse(formData.get('id')) : null;
    const input = resourceSchema.parse(formToObject(formData));
    const store = await getStore();
    const now = new Date().toISOString();

    if (id) {
      await store.update<Resource>('resources', id, { ...input, external: true, updatedAt: now });
      await audit({
        actorId: user.id, actorName: user.displayName, action: 'RESOURCE_UPDATED',
        entityType: 'resource', entityId: id,
      });
      revalidatePath('/resources');
      return { id };
    }

    const created = await store.insert<Resource>('resources', {
      ...input,
      slug: uniqueSlug(input.title, await takenSlugs('resources')),
      external: true,
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await audit({
      actorId: user.id, actorName: user.displayName, action: 'RESOURCE_CREATED',
      entityType: 'resource', entityId: created.id,
    });
    revalidatePath('/resources');
    return { id: created.id };
  });
}

export async function deleteResourceAction(id: string): Promise<ActionResult<{ deleted: true }>> {
  return action(async () => {
    const user = await requirePermission('resource:manage');
    const store = await getStore();
    await store.delete('resources', uuid.parse(id));
    await audit({
      actorId: user.id, actorName: user.displayName, action: 'RESOURCE_DELETED',
      entityType: 'resource', entityId: id,
    });
    revalidatePath('/resources');
    return { deleted: true as const };
  });
}

/* ------------------------------------------------------------------ utils */

/**
 * Notifies a club's followers that it published something.
 * Capped so a club with thousands of followers cannot stall the request; the
 * remainder is picked up by the follower's feed regardless.
 */
async function notifyClubFollowers(
  clubId: string,
  title: string,
  href: string,
  prefix = 'New from',
): Promise<void> {
  const club = await getClubById(clubId);
  if (!club) return;
  const followers = (await followersOfClub(clubId)).slice(0, 500);
  if (followers.length === 0) return;

  await notify(
    followers.map((userId) => ({
      userId,
      type: 'CLUB_UPDATE' as const,
      title: `${prefix} ${club.name}`,
      body: title,
      href,
    })),
  );
}

export async function requireEditorAccess(): Promise<void> {
  await requireUser();
}
