import type { Role } from '@/types/domain';

/**
 * Role-based access control.
 *
 * This module is pure and synchronous so it can be unit-tested exhaustively and
 * reused identically on the server and (for UI affordances only) on the client.
 *
 * SECURITY: the client is never trusted to report its own role. Every call site
 * that matters resolves the role from the session cookie on the server via
 * `getSessionUser()` and then calls `can()`. Hiding a button is a courtesy;
 * `requirePermission()` in the server actions is the actual gate.
 */

export const PERMISSIONS = [
  // content
  'post:create', 'post:edit:own', 'post:edit:any', 'post:publish', 'post:delete',
  'event:create', 'event:edit:own', 'event:edit:any', 'event:publish', 'event:delete',
  'opportunity:manage', 'resource:manage',
  // clubs
  'club:create', 'club:edit:own', 'club:edit:any', 'club:approve', 'club:verify', 'club:members:manage',
  // ads
  'ad:create', 'ad:review', 'ad:analytics:own', 'ad:analytics:all',
  // pyq
  'pyq:upload', 'pyq:approve', 'pyq:delete', 'pyq:metadata:manage',
  // community
  'discussion:create', 'comment:create', 'lostfound:create',
  // moderation
  'moderation:queue', 'moderation:act', 'lostfound:moderate',
  // users
  'user:list', 'user:suspend', 'user:role:assign', 'user:role:assign:elevated',
  // platform
  'analytics:view', 'audit:view', 'admin:access', 'settings:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Direct grants per role. Roles are *not* hierarchical by rank number — each
 * role's effective set is built by unioning the sets it inherits from, which
 * keeps the model explicit and auditable.
 */
const INHERITS: Record<Role, readonly Role[]> = {
  STUDENT: [],
  CLUB_MEMBER: ['STUDENT'],
  CLUB_ADMIN: ['CLUB_MEMBER'],
  EDITOR: ['CLUB_MEMBER'],
  MODERATOR: ['CLUB_MEMBER'],
  ADMIN: ['EDITOR', 'MODERATOR', 'CLUB_ADMIN'],
  SUPER_ADMIN: ['ADMIN'],
};

const DIRECT: Record<Role, readonly Permission[]> = {
  STUDENT: ['discussion:create', 'comment:create', 'lostfound:create', 'pyq:upload'],
  CLUB_MEMBER: [],
  CLUB_ADMIN: [
    'post:create', 'post:edit:own',
    'event:create', 'event:edit:own',
    'club:edit:own', 'club:members:manage',
    'ad:create', 'ad:analytics:own',
  ],
  EDITOR: [
    'post:create', 'post:edit:own', 'post:edit:any', 'post:publish',
    'event:create', 'event:edit:own', 'event:edit:any', 'event:publish',
    'opportunity:manage', 'resource:manage',
    'pyq:approve', 'pyq:metadata:manage',
    'admin:access', 'analytics:view',
  ],
  MODERATOR: [
    'moderation:queue', 'moderation:act', 'lostfound:moderate',
    'post:edit:any', 'ad:review', 'user:list',
    'admin:access',
  ],
  ADMIN: [
    'post:delete', 'event:delete', 'pyq:delete',
    'club:create', 'club:edit:any', 'club:approve', 'club:verify',
    'ad:analytics:all',
    'user:suspend', 'user:role:assign',
    'audit:view',
  ],
  SUPER_ADMIN: ['user:role:assign:elevated', 'settings:manage'],
};

function resolve(role: Role, seen = new Set<Role>()): Set<Permission> {
  if (seen.has(role)) return new Set();
  seen.add(role);
  const out = new Set<Permission>(DIRECT[role]);
  for (const parent of INHERITS[role]) {
    for (const p of resolve(parent, seen)) out.add(p);
  }
  return out;
}

function buildEffective(): Record<Role, ReadonlySet<Permission>> {
  const table = {} as Record<Role, ReadonlySet<Permission>>;
  for (const role of Object.keys(INHERITS) as Role[]) table[role] = resolve(role);
  return table;
}

const EFFECTIVE = buildEffective();

/** Roles that only a SUPER_ADMIN may hand out. */
const ELEVATED_ROLES: readonly Role[] = ['ADMIN', 'SUPER_ADMIN'];

export function permissionsFor(role: Role): Permission[] {
  return [...EFFECTIVE[role]].sort();
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return EFFECTIVE[role]?.has(permission) ?? false;
}

export function canAny(role: Role | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** Whether `role` is allowed to see the /admin console at all. */
export function canAccessAdmin(role: Role | null | undefined): boolean {
  return can(role, 'admin:access');
}

/**
 * Whether `actorRole` may assign `targetRole` to somebody.
 * Only SUPER_ADMIN can mint ADMIN/SUPER_ADMIN, which prevents an ADMIN from
 * escalating a colleague (or themselves via a second account) to super admin.
 */
export function canAssignRole(actorRole: Role | null | undefined, targetRole: Role): boolean {
  if (!actorRole) return false;
  if (ELEVATED_ROLES.includes(targetRole)) return can(actorRole, 'user:role:assign:elevated');
  return can(actorRole, 'user:role:assign');
}

/**
 * Ownership-aware check for club-scoped resources.
 * A CLUB_ADMIN may only touch clubs they actually administer; anyone holding the
 * `:any` permission bypasses the ownership requirement.
 */
export function canManageClub(
  role: Role | null | undefined,
  clubId: string,
  adminOfClubIds: readonly string[],
): boolean {
  if (can(role, 'club:edit:any')) return true;
  return can(role, 'club:edit:own') && adminOfClubIds.includes(clubId);
}

export function canManageClubContent(
  role: Role | null | undefined,
  clubId: string | null,
  adminOfClubIds: readonly string[],
  kind: 'post' | 'event',
): boolean {
  if (can(role, `${kind}:edit:any`)) return true;
  if (!clubId) return false;
  return can(role, `${kind}:edit:own`) && adminOfClubIds.includes(clubId);
}

/** A user may always edit their own authored draft even without `:any`. */
export function canEditOwnAuthored(
  role: Role | null | undefined,
  authorId: string,
  userId: string | null,
  kind: 'post' | 'event',
): boolean {
  if (can(role, `${kind}:edit:any`)) return true;
  return Boolean(userId) && authorId === userId && can(role, `${kind}:edit:own`);
}

export class AuthorizationError extends Error {
  readonly code = 'FORBIDDEN' as const;
  constructor(public readonly permission: string) {
    super(`Missing permission: ${permission}`);
    this.name = 'AuthorizationError';
  }
}

export class AuthenticationError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;
  constructor(message = 'You need to sign in to do that.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}
