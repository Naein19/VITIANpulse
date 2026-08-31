'use server';

import { revalidatePath } from 'next/cache';
import { getStore, getPrivilegedStore } from '@/server/db';
import { requireClubPermission, requirePermission, requireUser } from '@/server/auth/session';
import { AuthorizationError, can } from '@/server/auth/rbac';
import { clubSchema, uuid, type ActionResult } from '@/server/validation/schemas';
import { uniqueSlug } from '@/lib/sanitize';
import { audit } from '@/server/db/repositories/admin';
import { getClubById } from '@/server/db/repositories/clubs';
import { action, formToObject, limit } from './_shared';
import type { Club, ClubMember, ClubRole, ContentStatus, Profile } from '@/types/domain';

/**
 * Club administration.
 *
 * The ownership rule enforced here is the one tested in
 * `src/server/actions/clubs.test.ts`: a CLUB_ADMIN can edit only the clubs they
 * administer, and cannot verify or approve any club — those need platform roles.
 */

export async function saveClubAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ slug: string }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('content:write', user.id);

    const id = formData.get('id') ? uuid.parse(formData.get('id')) : null;
    const input = clubSchema.parse(formToObject(formData));
    const store = await getStore();
    const now = new Date().toISOString();

    if (id) {
      await requireClubPermission(id, 'club:edit:own', 'club:edit:any');
      const existing = await getClubById(id);
      if (!existing) throw new Error('That club no longer exists.');

      await store.update<Club>('clubs', id, { ...input, updatedAt: now });
      await audit({
        actorId: user.id, actorName: user.displayName, action: 'CLUB_UPDATED',
        entityType: 'club', entityId: id,
      });
      revalidatePath(`/clubs/${existing.slug}`);
      revalidatePath('/clubs');
      return { slug: existing.slug };
    }

    // New clubs always land as PENDING_REVIEW — creation never implies approval.
    await requirePermission('club:create');
    const { rows } = await store.select<{ id: string; slug: string }>({ table: 'clubs', limit: 1_000 });
    const slug = uniqueSlug(input.name, new Set(rows.map((r) => r.slug)));

    const created = await store.insert<Club>('clubs', {
      ...input,
      slug,
      verified: false,
      status: 'PENDING_REVIEW',
      followerCount: 0,
      galleryUrls: [],
      createdAt: now,
      updatedAt: now,
    });

    // The creator becomes the club's first admin so they can manage it at once.
    await store.insert<ClubMember>('club_members', {
      clubId: created.id,
      userId: user.id,
      clubRole: 'ADMIN',
      title: 'Club Lead',
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'CLUB_CREATED',
      entityType: 'club', entityId: created.id, detail: input.name,
    });

    revalidatePath('/clubs');
    revalidatePath('/admin/clubs');
    return { slug };
  });
}

export async function setClubStatusAction(
  clubId: string,
  status: ContentStatus,
): Promise<ActionResult<{ status: ContentStatus }>> {
  return action(async () => {
    const user = await requirePermission('club:approve');
    const club = await getClubById(uuid.parse(clubId));
    if (!club) throw new Error('That club no longer exists.');

    const store = await getStore();
    await store.update<Club>('clubs', club.id, { status, updatedAt: new Date().toISOString() });
    await audit({
      actorId: user.id, actorName: user.displayName, action: `CLUB_${status}`,
      entityType: 'club', entityId: club.id, detail: club.name,
    });

    revalidatePath('/admin/clubs');
    revalidatePath('/clubs');
    return { status };
  });
}

export async function setClubVerifiedAction(
  clubId: string,
  verified: boolean,
): Promise<ActionResult<{ verified: boolean }>> {
  return action(async () => {
    const user = await requirePermission('club:verify');
    const club = await getClubById(uuid.parse(clubId));
    if (!club) throw new Error('That club no longer exists.');

    const store = await getStore();
    await store.update<Club>('clubs', club.id, { verified, updatedAt: new Date().toISOString() });
    await audit({
      actorId: user.id, actorName: user.displayName, action: verified ? 'CLUB_VERIFIED' : 'CLUB_UNVERIFIED',
      entityType: 'club', entityId: club.id, detail: club.name,
    });

    revalidatePath('/admin/clubs');
    revalidatePath(`/clubs/${club.slug}`);
    return { verified };
  });
}

export async function addClubMemberAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ added: true }>> {
  return action(async () => {
    const clubId = uuid.parse(formData.get('clubId'));
    const user = await requireClubPermission(clubId, 'club:members:manage', 'club:edit:any');

    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const clubRole = String(formData.get('clubRole') ?? 'MEMBER') as ClubRole;
    const title = String(formData.get('title') ?? '').trim().slice(0, 60) || null;

    if (!['MEMBER', 'CORE', 'LEAD', 'ADMIN'].includes(clubRole)) throw new Error('Unknown club role.');
    // Only someone who can administer any club may mint another club admin.
    if (clubRole === 'ADMIN' && !can(user.role, 'club:edit:any') && !user.adminClubIds.includes(clubId)) {
      throw new AuthorizationError('club:edit:any');
    }

    const store = await getPrivilegedStore();
    const profile = await store.selectOne<Profile>({
      table: 'profiles',
      filters: [{ op: 'eq', col: 'email', value: email }],
    });
    if (!profile) throw new Error('No student with that email address has signed in yet.');

    const existing = await store.selectOne<ClubMember>({
      table: 'club_members',
      filters: [
        { op: 'eq', col: 'clubId', value: clubId },
        { op: 'eq', col: 'userId', value: profile.id },
      ],
    });

    if (existing) {
      await store.update<ClubMember>('club_members', existing.id, { clubRole, title });
    } else {
      await store.insert<ClubMember>('club_members', {
        clubId,
        userId: profile.id,
        clubRole,
        title,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        createdAt: new Date().toISOString(),
      });
      // Members get the CLUB_MEMBER platform role unless they already outrank it.
      if (profile.role === 'STUDENT') {
        await store.update<Profile>('profiles', profile.id, { role: 'CLUB_MEMBER' });
      }
    }

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'CLUB_MEMBER_SET',
      entityType: 'club', entityId: clubId, detail: `${profile.username}=${clubRole}`,
    });

    const club = await getClubById(clubId);
    if (club) revalidatePath(`/clubs/${club.slug}`);
    revalidatePath('/admin/clubs');
    return { added: true as const };
  });
}

export async function removeClubMemberAction(memberId: string): Promise<ActionResult<{ removed: true }>> {
  return action(async () => {
    const store = await getPrivilegedStore();
    const member = await store.selectOne<ClubMember>({
      table: 'club_members',
      filters: [{ op: 'eq', col: 'id', value: uuid.parse(memberId) }],
    });
    if (!member) return { removed: true as const };

    const user = await requireClubPermission(member.clubId, 'club:members:manage', 'club:edit:any');
    await store.delete('club_members', member.id);

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'CLUB_MEMBER_REMOVED',
      entityType: 'club', entityId: member.clubId, detail: member.displayName,
    });

    const club = await getClubById(member.clubId);
    if (club) revalidatePath(`/clubs/${club.slug}`);
    return { removed: true as const };
  });
}
