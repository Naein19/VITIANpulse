import { describe, expect, it } from 'vitest';
import {
  can, canAccessAdmin, canAssignRole, canEditOwnAuthored, canManageClub,
  canManageClubContent, permissionsFor,
} from './rbac';
import { ROLES } from '@/types/domain';

/**
 * These tests encode the authorisation rules the brief calls out explicitly:
 * a student cannot reach admin surfaces, a club admin cannot touch another
 * club, and a moderator cannot perform super-admin actions.
 */

describe('role permissions', () => {
  it('gives a student only community-participation rights', () => {
    expect(can('STUDENT', 'discussion:create')).toBe(true);
    expect(can('STUDENT', 'comment:create')).toBe(true);
    expect(can('STUDENT', 'pyq:upload')).toBe(true);

    expect(can('STUDENT', 'admin:access')).toBe(false);
    expect(can('STUDENT', 'post:publish')).toBe(false);
    expect(can('STUDENT', 'pyq:approve')).toBe(false);
    expect(can('STUDENT', 'user:suspend')).toBe(false);
    expect(can('STUDENT', 'moderation:act')).toBe(false);
  });

  it('never grants a permission to a null or unknown role', () => {
    expect(can(null, 'discussion:create')).toBe(false);
    expect(can(undefined, 'admin:access')).toBe(false);
  });

  it('lets a club admin submit but never self-publish', () => {
    expect(can('CLUB_ADMIN', 'post:create')).toBe(true);
    expect(can('CLUB_ADMIN', 'event:create')).toBe(true);
    expect(can('CLUB_ADMIN', 'ad:create')).toBe(true);

    expect(can('CLUB_ADMIN', 'post:publish')).toBe(false);
    expect(can('CLUB_ADMIN', 'event:publish')).toBe(false);
    expect(can('CLUB_ADMIN', 'ad:review')).toBe(false);
    expect(can('CLUB_ADMIN', 'club:verify')).toBe(false);
  });

  it('separates editorial from moderation authority', () => {
    // An editor publishes content but cannot act on reports.
    expect(can('EDITOR', 'post:publish')).toBe(true);
    expect(can('EDITOR', 'moderation:act')).toBe(false);

    // A moderator hides content but cannot publish it.
    expect(can('MODERATOR', 'moderation:act')).toBe(true);
    expect(can('MODERATOR', 'post:publish')).toBe(false);
  });

  it('stops a moderator performing super-admin actions', () => {
    expect(can('MODERATOR', 'user:role:assign')).toBe(false);
    expect(can('MODERATOR', 'user:role:assign:elevated')).toBe(false);
    expect(can('MODERATOR', 'settings:manage')).toBe(false);
  });

  it('gives an admin everything except the elevated grants', () => {
    expect(can('ADMIN', 'post:publish')).toBe(true);
    expect(can('ADMIN', 'moderation:act')).toBe(true);
    expect(can('ADMIN', 'user:suspend')).toBe(true);
    expect(can('ADMIN', 'club:verify')).toBe(true);

    expect(can('ADMIN', 'user:role:assign:elevated')).toBe(false);
    expect(can('ADMIN', 'settings:manage')).toBe(false);
  });

  it('makes SUPER_ADMIN a strict superset of ADMIN', () => {
    for (const permission of permissionsFor('ADMIN')) {
      expect(can('SUPER_ADMIN', permission)).toBe(true);
    }
    expect(can('SUPER_ADMIN', 'user:role:assign:elevated')).toBe(true);
  });

  it('exposes admin surfaces only to staff roles', () => {
    expect(canAccessAdmin('STUDENT')).toBe(false);
    expect(canAccessAdmin('CLUB_MEMBER')).toBe(false);
    expect(canAccessAdmin('CLUB_ADMIN')).toBe(false);
    expect(canAccessAdmin('EDITOR')).toBe(true);
    expect(canAccessAdmin('MODERATOR')).toBe(true);
    expect(canAccessAdmin('ADMIN')).toBe(true);
    expect(canAccessAdmin('SUPER_ADMIN')).toBe(true);
  });

  it('resolves inheritance without duplicating or losing permissions', () => {
    for (const role of ROLES) {
      const permissions = permissionsFor(role);
      expect(new Set(permissions).size).toBe(permissions.length);
    }
    // ADMIN inherits from three parents that share ancestors; nothing is lost.
    expect(permissionsFor('ADMIN')).toEqual(expect.arrayContaining(permissionsFor('EDITOR')));
    expect(permissionsFor('ADMIN')).toEqual(expect.arrayContaining(permissionsFor('MODERATOR')));
    expect(permissionsFor('ADMIN')).toEqual(expect.arrayContaining(permissionsFor('CLUB_ADMIN')));
  });
});

describe('role assignment guards', () => {
  it('only lets a super admin mint elevated roles', () => {
    expect(canAssignRole('ADMIN', 'EDITOR')).toBe(true);
    expect(canAssignRole('ADMIN', 'MODERATOR')).toBe(true);

    // The escalation path that matters.
    expect(canAssignRole('ADMIN', 'ADMIN')).toBe(false);
    expect(canAssignRole('ADMIN', 'SUPER_ADMIN')).toBe(false);

    expect(canAssignRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
    expect(canAssignRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
  });

  it('refuses assignment from roles without the base permission', () => {
    expect(canAssignRole('MODERATOR', 'STUDENT')).toBe(false);
    expect(canAssignRole('EDITOR', 'STUDENT')).toBe(false);
    expect(canAssignRole('STUDENT', 'STUDENT')).toBe(false);
  });
});

describe('club ownership', () => {
  const OWNED = 'club-a';
  const OTHER = 'club-b';

  it('stops a club admin editing a club they do not administer', () => {
    expect(canManageClub('CLUB_ADMIN', OWNED, [OWNED])).toBe(true);
    expect(canManageClub('CLUB_ADMIN', OTHER, [OWNED])).toBe(false);
  });

  it('lets platform admins bypass the ownership requirement', () => {
    expect(canManageClub('ADMIN', OTHER, [])).toBe(true);
    expect(canManageClub('SUPER_ADMIN', OTHER, [])).toBe(true);
  });

  it('scopes club content to the owning club', () => {
    expect(canManageClubContent('CLUB_ADMIN', OWNED, [OWNED], 'post')).toBe(true);
    expect(canManageClubContent('CLUB_ADMIN', OTHER, [OWNED], 'post')).toBe(false);
    expect(canManageClubContent('CLUB_ADMIN', OTHER, [OWNED], 'event')).toBe(false);

    // Content with no club cannot be claimed via club membership.
    expect(canManageClubContent('CLUB_ADMIN', null, [OWNED], 'post')).toBe(false);

    // An editor holds `:any` and is unaffected by ownership.
    expect(canManageClubContent('EDITOR', OTHER, [], 'post')).toBe(true);
  });

  it('lets an author edit their own draft without a club', () => {
    expect(canEditOwnAuthored('CLUB_ADMIN', 'user-1', 'user-1', 'post')).toBe(true);
    expect(canEditOwnAuthored('CLUB_ADMIN', 'user-1', 'user-2', 'post')).toBe(false);
    expect(canEditOwnAuthored('STUDENT', 'user-1', 'user-1', 'post')).toBe(false);
    expect(canEditOwnAuthored('EDITOR', 'user-1', 'user-2', 'post')).toBe(true);
  });
});
