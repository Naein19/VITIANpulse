import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/auth/session';
import { canAccessAdmin } from '@/server/auth/rbac';
import { AdminNav } from '@/components/admin/admin-nav';
import { countOpenReports } from '@/server/db/repositories/community';
import { listAdsForAdmin } from '@/server/db/repositories/ads';
import { listPyqPapers } from '@/server/db/repositories/catalog';
import { listPostsForAdmin } from '@/server/db/repositories/posts';

/**
 * Admin console shell.
 *
 * This layout is the first of two gates. It stops a student *seeing* the
 * console; the second gate is `requirePermission` inside every server action,
 * which is what actually stops them *doing* anything. Hiding the UI alone would
 * not be security.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (!canAccessAdmin(user.role)) redirect('/forbidden');

  // Queue counts drive the badges in the nav so work is visible at a glance.
  const [reports, ads, pyqs, drafts] = await Promise.all([
    countOpenReports(),
    listAdsForAdmin({ status: 'PENDING_REVIEW' }),
    listPyqPapers({ status: 'PENDING_REVIEW', pageSize: 1 }),
    listPostsForAdmin({ status: 'PENDING_REVIEW', pageSize: 1 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-7 sm:px-6">
      <div className="grid gap-7 lg:grid-cols-[210px_minmax(0,1fr)]">
        <AdminNav
          role={user.role}
          counts={{
            moderation: reports,
            ads: ads.length,
            pyqs: pyqs.total,
            posts: drafts.total,
          }}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
