import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Avatar, MetaRow } from '@/components/ui/misc';
import { ProfileForm } from '@/components/auth/profile-form';
import { pageMetadata } from '@/lib/metadata';
import { formatDate, humanise } from '@/lib/format';
import { getSessionUser } from '@/server/auth/session';
import { permissionsFor } from '@/server/auth/rbac';
import { listFollowedClubIds } from '@/server/db/repositories/engagement';

/** Profile and academic details, which drive personalisation across the app. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Profile',
  description: 'Your branch, year, semester and interests.',
  path: '/profile',
  noIndex: true,
});

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/profile');

  const followed = await listFollowedClubIds(user.id);
  const permissions = permissionsFor(user.role);

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Your branch, year and interests decide what VITPulse puts in front of you."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Profile' }]}
      />

      <PageBody>
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 max-w-2xl">
            <ProfileForm
              initial={{
                displayName: user.displayName,
                bio: user.bio ?? '',
                branch: user.branch,
                school: user.school,
                year: user.year,
                semester: user.semester,
                interests: user.interests,
              }}
            />
          </div>

          <aside className="min-w-0 space-y-6">
            <section className="rounded-md border border-line bg-primary p-4">
              <div className="flex items-center gap-3">
                <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate t-strong text-ink">{user.displayName}</p>
                  <p className="truncate text-[12px] text-faint">@{user.username}</p>
                </div>
              </div>
              <dl className="mt-4 divide-y divide-line border-t border-line pt-1">
                <MetaRow label="Email">
                  <span className="break-all text-[12px]">{user.email}</span>
                </MetaRow>
                <MetaRow label="Role">
                  <Badge tone="brand" size="xs">{humanise(user.role)}</Badge>
                </MetaRow>
                {user.registrationNumber && <MetaRow label="Register no.">{user.registrationNumber}</MetaRow>}
                <MetaRow label="Following">
                  <span className="vp-numeric">{followed.length}</span> clubs
                </MetaRow>
                <MetaRow label="Joined">{formatDate(user.createdAt)}</MetaRow>
              </dl>
            </section>

            <section className="rounded-md border border-line bg-tertiary p-4">
              <h2 className="t-label mb-2 text-faint">What your role can do</h2>
              <p className="mb-2.5 text-[12px] leading-relaxed text-muted">
                Permissions are enforced on the server for every action, not just hidden in the interface.
              </p>
              <ul className="flex flex-wrap gap-1">
                {permissions.slice(0, 14).map((permission) => (
                  <li key={permission}>
                    <span className="inline-block rounded-[3px] border border-line bg-primary px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
                      {permission}
                    </span>
                  </li>
                ))}
                {permissions.length > 14 && (
                  <li className="self-center text-[11px] text-faint">+{permissions.length - 14} more</li>
                )}
              </ul>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
