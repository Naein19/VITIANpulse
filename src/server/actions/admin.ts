'use server';

import { revalidatePath } from 'next/cache';
import { getPrivilegedStore } from '@/server/db';
import { requirePermission } from '@/server/auth/session';
import { canAssignRole } from '@/server/auth/rbac';
import { AuthorizationError } from '@/server/auth/rbac';
import { roleAssignSchema, suspendSchema, type ActionResult } from '@/server/validation/schemas';
import { audit, getProfileById } from '@/server/db/repositories/admin';
import { notify } from '@/server/db/repositories/engagement';
import { action, formToObject } from './_shared';
import type { Profile, Role } from '@/types/domain';

/**
 * User administration.
 *
 * Two escalation guards matter here and are covered by tests:
 *  - only a SUPER_ADMIN can grant ADMIN or SUPER_ADMIN (`canAssignRole`)
 *  - nobody can change their own role, which blocks the trivial self-promotion
 */

export async function assignRoleAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ role: Role }>> {
  return action(async () => {
    const actor = await requirePermission('user:role:assign');
    const input = roleAssignSchema.parse(formToObject(formData));

    if (input.userId === actor.id) throw new Error('You cannot change your own role.');
    if (!canAssignRole(actor.role, input.role)) throw new AuthorizationError('user:role:assign:elevated');

    const target = await getProfileById(input.userId);
    if (!target) throw new Error('That account no longer exists.');
    // Nobody below SUPER_ADMIN may demote or alter a SUPER_ADMIN.
    if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('user:role:assign:elevated');
    }

    const store = await getPrivilegedStore();
    await store.update<Profile>('profiles', target.id, { role: input.role, updatedAt: new Date().toISOString() });

    await audit({
      actorId: actor.id, actorName: actor.displayName, action: 'ROLE_ASSIGNED',
      entityType: 'profile', entityId: target.id, detail: `${target.role} -> ${input.role}`,
    });

    await notify([
      {
        userId: target.id,
        type: 'SYSTEM',
        title: 'Your VITPulse role changed',
        body: `You now have the ${input.role.replace(/_/g, ' ').toLowerCase()} role.`,
        href: '/profile',
      },
    ]);

    revalidatePath('/admin/users');
    return { role: input.role };
  });
}

export async function suspendUserAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ suspended: boolean }>> {
  return action(async () => {
    const actor = await requirePermission('user:suspend');
    const input = suspendSchema.parse(formToObject(formData));

    if (input.userId === actor.id) throw new Error('You cannot suspend your own account.');

    const target = await getProfileById(input.userId);
    if (!target) throw new Error('That account no longer exists.');
    if ((target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') && actor.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('user:role:assign:elevated');
    }

    const store = await getPrivilegedStore();
    await store.update<Profile>('profiles', target.id, {
      suspended: input.suspended,
      suspendedReason: input.suspended ? input.reason : null,
      updatedAt: new Date().toISOString(),
    });

    await audit({
      actorId: actor.id, actorName: actor.displayName,
      action: input.suspended ? 'USER_SUSPENDED' : 'USER_REINSTATED',
      entityType: 'profile', entityId: target.id, detail: input.reason ?? undefined,
    });

    revalidatePath('/admin/users');
    return { suspended: input.suspended };
  });
}
