'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ShieldCheck, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Select, Textarea } from '@/components/ui/field';
import { Alert, Avatar } from '@/components/ui/misc';
import { Table, Th, Td, Tr, DataList, DataListRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatDate, humanise } from '@/lib/format';
import { canAssignRole } from '@/server/auth/rbac';
import { assignRoleAction, suspendUserAction } from '@/server/actions/admin';
import { ROLES, type Profile, type Role } from '@/types/domain';

/**
 * The user list.
 *
 * Dense table on desktop, stacked rows on mobile. Role options are filtered by
 * `canAssignRole` so an admin never even sees SUPER_ADMIN in the dropdown — and
 * the server re-checks the same predicate before writing.
 */
export function UserTable({
  users,
  actorId,
  actorRole,
  canAssign,
  canSuspend,
}: {
  users: readonly Profile[];
  actorId: string;
  actorRole: Role;
  canAssign: boolean;
  canSuspend: boolean;
}) {
  const [editing, setEditing] = useState<Profile | null>(null);
  const [suspending, setSuspending] = useState<Profile | null>(null);

  return (
    <>
      <div className="hidden md:block">
        <Table caption="Registered accounts">
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Branch / year</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.displayName} src={user.avatarUrl} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{user.displayName}</p>
                      <p className="truncate text-[11.5px] text-faint">{user.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-[12.5px]">
                  {user.branch ?? '—'}
                  {user.year ? ` · Y${user.year}` : ''}
                </Td>
                <Td>
                  <Badge tone={user.role === 'STUDENT' ? 'neutral' : 'brand'} size="xs">
                    {humanise(user.role)}
                  </Badge>
                </Td>
                <Td>
                  {user.suspended ? (
                    <Badge tone="danger" size="xs">Suspended</Badge>
                  ) : (
                    <Badge tone="success" size="xs">Active</Badge>
                  )}
                </Td>
                <Td className="text-[12px] text-faint">{formatDate(user.createdAt)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    {canAssign && user.id !== actorId && (
                      <Button size="xs" variant="secondary" onClick={() => setEditing(user)}>
                        <UserCog className="size-3" aria-hidden="true" />
                        Role
                      </Button>
                    )}
                    {canSuspend && user.id !== actorId && (
                      <Button
                        size="xs"
                        variant={user.suspended ? 'secondary' : 'danger'}
                        onClick={() => setSuspending(user)}
                      >
                        {user.suspended ? (
                          <ShieldCheck className="size-3" aria-hidden="true" />
                        ) : (
                          <Ban className="size-3" aria-hidden="true" />
                        )}
                        {user.suspended ? 'Reinstate' : 'Suspend'}
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      <DataList className="md:hidden">
        {users.map((user) => (
          <DataListRow
            key={user.id}
            title={user.displayName}
            subtitle={user.email}
            meta={
              <>
                <Badge tone={user.role === 'STUDENT' ? 'neutral' : 'brand'} size="xs">{humanise(user.role)}</Badge>
                {user.suspended && <Badge tone="danger" size="xs">Suspended</Badge>}
                {user.branch && <Badge tone="outline" size="xs">{user.branch}</Badge>}
              </>
            }
            action={
              canAssign && user.id !== actorId ? (
                <Button size="xs" variant="secondary" onClick={() => setEditing(user)}>Role</Button>
              ) : undefined
            }
          />
        ))}
      </DataList>

      {editing && (
        <RoleModal user={editing} actorRole={actorRole} onClose={() => setEditing(null)} />
      )}
      {suspending && (
        <SuspendModal user={suspending} onClose={() => setSuspending(null)} />
      )}
    </>
  );
}

function RoleModal({ user, actorRole, onClose }: { user: Profile; actorRole: Role; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const assignable = ROLES.filter((role) => canAssignRole(actorRole, role));

  const [, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await assignRoleAction(null, formData);
      if (result.ok) {
        toast(`${user.displayName} is now ${humanise(result.data.role)}`, 'success');
        onClose();
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
      return result;
    },
    null,
  );

  return (
    <Modal open onClose={onClose} title={`Change role — ${user.displayName}`} size="sm">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="userId" value={user.id} />
        <Field label="Role" htmlFor="role-select" required description="The account is notified of the change.">
          <Select id="role-select" name="role" defaultValue={user.role} required>
            {assignable.map((role) => (
              <option key={role} value={role}>{humanise(role)}</option>
            ))}
          </Select>
        </Field>
        <Alert tone="neutral">
          Roles grant real capability. Editors can publish, moderators can hide content, admins can delete and verify.
        </Alert>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" type="submit" loading={pending}>Update role</Button>
        </div>
      </form>
    </Modal>
  );
}

function SuspendModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const reinstating = user.suspended;

  const [, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await suspendUserAction(null, formData);
      if (result.ok) {
        toast(result.data.suspended ? 'Account suspended' : 'Account reinstated', 'success');
        onClose();
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
      return result;
    },
    null,
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={reinstating ? `Reinstate ${user.displayName}` : `Suspend ${user.displayName}`}
      size="sm"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="suspended" value={reinstating ? 'false' : 'true'} />

        {!reinstating && (
          <Field label="Reason" htmlFor="suspend-reason" description="Stored on the account and in the audit log.">
            <Textarea id="suspend-reason" name="reason" rows={3} maxLength={240} autoFocus />
          </Field>
        )}

        <Alert tone={reinstating ? 'success' : 'warning'}>
          {reinstating
            ? 'The account regains its previous role and can post again.'
            : 'A suspended account keeps its session but loses every permission — it cannot post, comment, upload or register.'}
        </Alert>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant={reinstating ? 'primary' : 'danger'} type="submit" loading={pending}>
            {reinstating ? 'Reinstate' : 'Suspend account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
