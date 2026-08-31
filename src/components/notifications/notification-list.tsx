'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  Bell, CalendarClock, CheckCheck, FileText, Megaphone, ShieldAlert, Sparkles, Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatRelative } from '@/lib/format';
import { markAllNotificationsReadAction, markNotificationReadAction } from '@/server/actions/engagement';
import type { Notification, NotificationType } from '@/types/domain';

const ICON: Record<NotificationType, typeof Bell> = {
  EVENT_REMINDER: CalendarClock,
  CLUB_UPDATE: Users,
  ANNOUNCEMENT: Megaphone,
  PYQ_UPLOAD: FileText,
  OPPORTUNITY_DEADLINE: Sparkles,
  SYSTEM: Bell,
  MODERATION: ShieldAlert,
};

/**
 * The notification inbox.
 *
 * Opening a notification marks it read as a side effect of navigating, which is
 * what people expect; "mark all" is a single bulk update scoped to the caller.
 */
export function NotificationList({
  notifications,
  unreadCount,
}: {
  notifications: readonly Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const now = Date.now();

  return (
    <>
      {unreadCount > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
          <p className="t-sm text-muted">
            <span className="vp-numeric font-semibold text-ink">{unreadCount}</span> unread
          </p>
          <Button
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await markAllNotificationsReadAction();
                if (!result.ok) {
                  toast(result.error, 'error');
                  return;
                }
                toast(`Marked ${result.data.count} as read`, 'success');
                router.refresh();
              })
            }
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            Mark all read
          </Button>
        </div>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-primary">
        {notifications.map((notification) => {
          const Icon = ICON[notification.type];
          const unread = !notification.readAt;
          const body = (
            <>
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                  unread ? 'border-blue/40 bg-info-soft text-info-ink' : 'border-line bg-tertiary text-faint',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-2">
                  <span className={cn('block t-sm-strong leading-snug', unread ? 'text-ink' : 'text-soft')}>
                    {notification.title}
                  </span>
                  {unread && (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue" aria-label="Unread" />
                  )}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">{notification.body}</span>
                <time className="mt-1 block text-[11.5px] text-faint" dateTime={notification.createdAt}>
                  {formatRelative(notification.createdAt, now)}
                </time>
              </span>
            </>
          );

          return (
            <li key={notification.id} className={cn(unread && 'bg-info-soft/30')}>
              {notification.href ? (
                <Link
                  href={notification.href}
                  onClick={() => {
                    if (unread) void markNotificationReadAction(notification.id);
                  }}
                  className="flex gap-3 p-3.5 transition-colors hover:bg-accent"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex gap-3 p-3.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
