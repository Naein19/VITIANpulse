import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BellOff } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { NotificationList } from '@/components/notifications/notification-list';
import { NotificationPreferences } from '@/components/notifications/preferences';
import { pageMetadata } from '@/lib/metadata';
import { getSessionUser } from '@/server/auth/session';
import { listNotifications, notificationPreferences } from '@/server/db/repositories/engagement';
import { NOTIFICATION_TYPES } from '@/types/domain';

/** Notification inbox plus per-category preferences. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Notifications',
  description: 'Event reminders, club updates, deadlines and announcements.',
  path: '/notifications',
  noIndex: true,
});

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/notifications');

  const [notifications, prefs] = await Promise.all([
    listNotifications(user.id, 60),
    notificationPreferences(user.id),
  ]);

  // Absent rows mean "not yet configured", which defaults to enabled.
  const resolved = Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [type, prefs[type] ?? true]),
  ) as Record<(typeof NOTIFICATION_TYPES)[number], boolean>;

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        eyebrow="Your inbox"
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread. VITPulse only notifies you about things you opted into.`
            : 'You are all caught up.'
        }
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Notifications' }]}
      />

      <PageBody>
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {notifications.length === 0 ? (
              <EmptyState
                icon={BellOff}
                title="No notifications yet"
                description="Register for an event or follow a club and reminders will start arriving here. We keep it deliberately quiet — duplicates are suppressed and you control every category."
              />
            ) : (
              <NotificationList notifications={notifications} unreadCount={unread} />
            )}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <NotificationPreferences initial={resolved} />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
