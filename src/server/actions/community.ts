'use server';

import { revalidatePath } from 'next/cache';
import { getStore, getPrivilegedStore } from '@/server/db';
import { requirePermission, requireUser } from '@/server/auth/session';
import {
  commentSchema, discussionSchema, lostFoundSchema, moderationActionSchema, reportSchema, uuid,
  type ActionResult,
} from '@/server/validation/schemas';
import { uniqueSlug } from '@/lib/sanitize';
import { audit } from '@/server/db/repositories/admin';
import { notify } from '@/server/db/repositories/engagement';
import { action, formToObject, limit } from './_shared';
import type { Comment, Discussion, LostFoundItem, Report } from '@/types/domain';

/**
 * Community features: discussions, comments, votes, lost & found and reporting.
 *
 * Anti-spam is layered rather than relying on any single check:
 *  1. Only signed-in students with a campus address can post at all.
 *  2. Per-user rate limits (6 threads / 5 min, 20 comments / 5 min).
 *  3. A minimum body length, so a thread cannot be a bare link.
 *  4. Every item is reportable and a moderator can hide it in one click.
 *  5. Suspended accounts lose every write permission at the session layer.
 */

const MIN_DISCUSSION_LENGTH = 40;

export async function createDiscussionAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  return action(async () => {
    const user = await requirePermission('discussion:create');
    await limit('community:post', user.id);
    const input = discussionSchema.parse(formToObject(formData));

    if (input.body.length < MIN_DISCUSSION_LENGTH) {
      throw new Error('Add a bit more detail — at least a couple of sentences.');
    }

    const store = await getStore();
    const { rows } = await store.select<{ id: string; slug: string }>({ table: 'discussions', limit: 2_000 });
    const slug = uniqueSlug(input.title, new Set(rows.map((r) => r.slug)));
    const now = new Date().toISOString();

    await store.insert<Omit<Discussion, 'author'>>('discussions', {
      ...input,
      slug,
      authorId: user.id,
      upvoteCount: 0,
      commentCount: 0,
      locked: false,
      hidden: false,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath('/discussions');
    return { slug };
  });
}

export async function createCommentAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const user = await requirePermission('comment:create');
    await limit('community:comment', user.id);
    const input = commentSchema.parse(formToObject(formData));

    const store = await getStore();
    const now = new Date().toISOString();
    const created = await store.insert<Omit<Comment, 'author'>>('comments', {
      ...input,
      authorId: user.id,
      upvoteCount: 0,
      hidden: false,
      createdAt: now,
      updatedAt: now,
    });

    // Keep the denormalised counter and the thread's "last active" in step.
    if (input.targetType === 'DISCUSSION') {
      await store.increment('discussions', input.targetId, 'commentCount');
      const thread = await store.selectOne<Discussion>({
        table: 'discussions',
        filters: [{ op: 'eq', col: 'id', value: input.targetId }],
      });
      if (thread) {
        await store.update('discussions', thread.id, { updatedAt: now });
        if (thread.authorId !== user.id) {
          await notify([
            {
              userId: thread.authorId,
              type: 'SYSTEM',
              title: 'New reply on your thread',
              body: `${user.displayName} replied to “${thread.title}”.`,
              href: `/discussions/${thread.slug}`,
            },
          ]);
        }
        revalidatePath(`/discussions/${thread.slug}`);
      }
    } else if (input.targetType === 'POST') {
      await store.increment('posts', input.targetId, 'commentCount');
    }

    return { id: created.id };
  });
}

/** Idempotent upvote toggle backed by a unique (user, target) vote row. */
export async function toggleUpvoteAction(
  targetType: 'DISCUSSION' | 'COMMENT',
  targetId: string,
): Promise<ActionResult<{ upvoted: boolean }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('content:write', user.id);
    const id = uuid.parse(targetId);

    const store = await getStore();
    const table = targetType === 'DISCUSSION' ? 'discussions' : 'comments';
    const existing = await store.selectOne({
      table: 'votes',
      filters: [
        { op: 'eq', col: 'userId', value: user.id },
        { op: 'eq', col: 'targetType', value: targetType },
        { op: 'eq', col: 'targetId', value: id },
      ],
    });

    if (existing) {
      await store.delete('votes', existing.id);
      await store.increment(table, id, 'upvoteCount', -1);
      return { upvoted: false };
    }

    await store.insert('votes', {
      userId: user.id,
      targetType,
      targetId: id,
      createdAt: new Date().toISOString(),
    });
    await store.increment(table, id, 'upvoteCount', 1);
    return { upvoted: true };
  });
}

/* ----------------------------------------------------------- lost & found */

export async function createLostFoundAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const user = await requirePermission('lostfound:create');
    await limit('lostfound:create', user.id);
    const input = lostFoundSchema.parse(formToObject(formData));

    const store = await getStore();
    const now = new Date().toISOString();
    // Every listing is moderated before it appears — this surface is a common
    // vector for scams and for publishing somebody else's contact details.
    const created = await store.insert<LostFoundItem>('lost_found', {
      ...input,
      contactValue: input.contactMethod === 'IN_APP' ? user.email : input.contactValue,
      status: 'PENDING_REVIEW',
      reporterId: user.id,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath('/lost-found');
    revalidatePath('/admin/moderation');
    return { id: created.id };
  });
}

export async function setLostFoundStatusAction(
  itemId: string,
  status: LostFoundItem['status'],
): Promise<ActionResult<{ status: LostFoundItem['status'] }>> {
  return action(async () => {
    const store = await getStore();
    const item = await store.selectOne<LostFoundItem>({
      table: 'lost_found',
      filters: [{ op: 'eq', col: 'id', value: uuid.parse(itemId) }],
    });
    if (!item) throw new Error('That listing no longer exists.');

    // The reporter can close their own listing; anything else needs a moderator.
    const user = await requireUser();
    const isOwner = item.reporterId === user.id;
    if (!(isOwner && status === 'RESOLVED')) {
      await requirePermission('lostfound:moderate');
    }

    await store.update<LostFoundItem>('lost_found', item.id, { status, updatedAt: new Date().toISOString() });
    await audit({
      actorId: user.id, actorName: user.displayName, action: `LOSTFOUND_${status}`,
      entityType: 'lost_found', entityId: item.id,
    });

    revalidatePath('/lost-found');
    revalidatePath('/admin/moderation');
    return { status };
  });
}

/* ------------------------------------------------------------- reporting */

export async function createReportAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('report:create', user.id);
    const input = reportSchema.parse(formToObject(formData));

    const store = await getPrivilegedStore();
    // One open report per user per item keeps the queue signal-rich.
    const existing = await store.selectOne<Report>({
      table: 'reports',
      filters: [
        { op: 'eq', col: 'reporterId', value: user.id },
        { op: 'eq', col: 'targetType', value: input.targetType },
        { op: 'eq', col: 'targetId', value: input.targetId },
        { op: 'eq', col: 'status', value: 'OPEN' },
      ],
    });
    if (existing) return { id: existing.id };

    const now = new Date().toISOString();
    const created = await store.insert<Report>('reports', {
      ...input,
      reporterId: user.id,
      status: 'OPEN',
      resolvedBy: null,
      resolutionNote: null,
      createdAt: now,
      updatedAt: now,
    });

    if (input.targetType === 'PYQ') {
      await store.increment('pyq_papers', input.targetId, 'reportCount');
    }

    revalidatePath('/admin/moderation');
    return { id: created.id };
  });
}

export async function moderationActAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ resolved: true }>> {
  return action(async () => {
    const user = await requirePermission('moderation:act');
    const input = moderationActionSchema.parse(formToObject(formData));

    const store = await getPrivilegedStore();
    const report = await store.selectOne<Report>({
      table: 'reports',
      filters: [{ op: 'eq', col: 'id', value: input.reportId }],
    });
    if (!report) throw new Error('That report no longer exists.');

    const now = new Date().toISOString();

    if (input.action === 'HIDE_CONTENT' || input.action === 'REMOVE_CONTENT') {
      await applyModeration(report, input.action);
    }

    await store.update<Report>('reports', report.id, {
      status: input.action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED',
      resolvedBy: user.id,
      resolutionNote: input.note,
      updatedAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: `MODERATION_${input.action}`,
      entityType: report.targetType.toLowerCase(), entityId: report.targetId, detail: input.note ?? undefined,
    });

    revalidatePath('/admin/moderation');
    revalidatePath('/discussions');
    return { resolved: true as const };
  });
}

async function applyModeration(report: Report, action: 'HIDE_CONTENT' | 'REMOVE_CONTENT'): Promise<void> {
  const store = await getPrivilegedStore();
  const remove = action === 'REMOVE_CONTENT';

  switch (report.targetType) {
    case 'DISCUSSION':
      if (remove) await store.delete('discussions', report.targetId);
      else await store.update('discussions', report.targetId, { hidden: true });
      break;
    case 'COMMENT':
      if (remove) await store.delete('comments', report.targetId);
      else await store.update('comments', report.targetId, { hidden: true });
      break;
    case 'POST':
      await store.update('posts', report.targetId, { status: remove ? 'ARCHIVED' : 'DRAFT' });
      break;
    case 'EVENT':
      await store.update('events', report.targetId, { status: remove ? 'ARCHIVED' : 'DRAFT' });
      break;
    case 'PYQ':
      if (remove) await store.delete('pyq_papers', report.targetId);
      else await store.update('pyq_papers', report.targetId, { status: 'PENDING_REVIEW' });
      break;
    case 'LOST_FOUND':
      await store.update('lost_found', report.targetId, { status: 'REJECTED' });
      break;
    case 'AD':
      await store.update('ads', report.targetId, { status: remove ? 'ENDED' : 'PAUSED' });
      break;
  }
}
