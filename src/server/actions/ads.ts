'use server';

import { revalidatePath } from 'next/cache';
import { getStore } from '@/server/db';
import { requireClubPermission, requirePermission } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { adReviewSchema, adSchema, uuid, type ActionResult } from '@/server/validation/schemas';
import { audit } from '@/server/db/repositories/admin';
import { getAdById } from '@/server/db/repositories/ads';
import { notify } from '@/server/db/repositories/engagement';
import { listClubMembers } from '@/server/db/repositories/clubs';
import { action, formToObject, limit } from './_shared';
import type { AdCampaign, AdStatus } from '@/types/domain';

/**
 * Advertisement lifecycle: draft → pending review → approved → paused/ended.
 *
 * A club admin can create and pause their own campaigns but can never approve
 * one; approval requires `ad:review`, held by moderators and above. Creatives
 * are plain text and the CTA URL is protocol-checked in the schema.
 */

export async function saveAdAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const id = formData.get('id') ? uuid.parse(formData.get('id')) : null;
    const input = adSchema.parse(formToObject(formData));
    const user = await requireClubPermission(input.clubId, 'ad:create', 'ad:review');
    await limit('content:write', user.id);

    const store = await getStore();
    const now = new Date().toISOString();

    if (id) {
      const existing = await getAdById(id);
      if (!existing) throw new Error('That campaign no longer exists.');
      await requireClubPermission(existing.clubId, 'ad:create', 'ad:review');

      // Editing an approved campaign sends it back for review — an advertiser
      // must not be able to swap the creative after approval.
      const status: AdStatus = existing.status === 'APPROVED' ? 'PENDING_REVIEW' : existing.status;
      await store.update<AdCampaign>('ads', id, { ...input, status, updatedAt: now });

      await audit({
        actorId: user.id, actorName: user.displayName, action: 'AD_UPDATED',
        entityType: 'ad', entityId: id, detail: `status=${status}`,
      });
      revalidatePath('/admin/ads');
      return { id };
    }

    const created = await store.insert<AdCampaign>('ads', {
      ...input,
      status: 'PENDING_REVIEW',
      impressionCount: 0,
      clickCount: 0,
      reviewedBy: null,
      reviewNote: null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'AD_SUBMITTED',
      entityType: 'ad', entityId: created.id, detail: input.name,
    });

    revalidatePath('/admin/ads');
    return { id: created.id };
  });
}

export async function reviewAdAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ status: AdStatus }>> {
  return action(async () => {
    const user = await requirePermission('ad:review');
    const input = adReviewSchema.parse(formToObject(formData));

    const ad = await getAdById(input.adId);
    if (!ad) throw new Error('That campaign no longer exists.');

    const store = await getStore();
    await store.update<AdCampaign>('ads', ad.id, {
      status: input.decision,
      reviewedBy: user.id,
      reviewNote: input.note,
      updatedAt: new Date().toISOString(),
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: `AD_${input.decision}`,
      entityType: 'ad', entityId: ad.id, detail: input.note ?? undefined,
    });

    // Tell the club's admins what happened to their submission.
    const members = await listClubMembers(ad.clubId);
    const admins = members.filter((m) => m.clubRole === 'ADMIN').map((m) => m.userId);
    if (admins.length > 0) {
      await notify(
        admins.map((userId) => ({
          userId,
          type: 'SYSTEM' as const,
          title: `Campaign ${input.decision.toLowerCase()}: ${ad.name}`,
          body: input.note ?? `Your campaign is now ${input.decision.toLowerCase()}.`,
          href: '/admin/ads',
        })),
      );
    }

    revalidatePath('/admin/ads');
    revalidatePath('/', 'layout');
    return { status: input.decision };
  });
}

/** A club admin may pause or resume their own approved campaign. */
export async function setAdRunStateAction(adId: string, paused: boolean): Promise<ActionResult<{ status: AdStatus }>> {
  return action(async () => {
    const ad = await getAdById(uuid.parse(adId));
    if (!ad) throw new Error('That campaign no longer exists.');
    const user = await requireClubPermission(ad.clubId, 'ad:create', 'ad:review');

    if (!paused && ad.status !== 'PAUSED' && !can(user.role, 'ad:review')) {
      throw new Error('Only a reviewer can move a campaign back into review.');
    }

    const status: AdStatus = paused ? 'PAUSED' : 'APPROVED';
    const store = await getStore();
    await store.update<AdCampaign>('ads', ad.id, { status, updatedAt: new Date().toISOString() });

    await audit({
      actorId: user.id, actorName: user.displayName, action: paused ? 'AD_PAUSED' : 'AD_RESUMED',
      entityType: 'ad', entityId: ad.id,
    });

    revalidatePath('/admin/ads');
    return { status };
  });
}
