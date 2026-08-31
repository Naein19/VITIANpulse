'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { updateNotificationPreferences } from '@/server/actions/auth';
import { NOTIFICATION_TYPES, type NotificationType } from '@/types/domain';

const LABELS: Record<NotificationType, { title: string; description: string }> = {
  EVENT_REMINDER: { title: 'Event reminders', description: 'Before an event you registered for starts.' },
  CLUB_UPDATE: { title: 'Club updates', description: 'When a club you follow posts or schedules something.' },
  ANNOUNCEMENT: { title: 'Announcements', description: 'Campus notices marked important or urgent.' },
  PYQ_UPLOAD: { title: 'PYQ approvals', description: 'When a paper you uploaded is approved.' },
  OPPORTUNITY_DEADLINE: { title: 'Deadlines', description: 'Before a saved opportunity closes.' },
  SYSTEM: { title: 'Account', description: 'Role changes, replies and account notices.' },
  MODERATION: { title: 'Moderation', description: 'Outcomes on content you reported or that was reported.' },
};

/**
 * Per-category notification preferences.
 *
 * Stored as one row per (user, type) rather than a JSON blob, so a newly added
 * category defaults to enabled instead of silently inheriting a stale shape.
 */
export function NotificationPreferences({ initial }: { initial: Record<NotificationType, boolean> }) {
  const { toast } = useToast();
  const [, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await updateNotificationPreferences(null, formData);
      toast(result.ok ? 'Preferences saved' : result.error, result.ok ? 'success' : 'error');
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="rounded-md border border-line bg-primary p-4">
      <h2 className="t-label mb-1 text-faint">Preferences</h2>
      <p className="mb-4 text-[12px] leading-relaxed text-muted">
        Turn off anything you do not want. VITPulse also suppresses duplicates within twelve hours.
      </p>

      <div className="space-y-4">
        {NOTIFICATION_TYPES.map((type) => (
          <Switch
            key={type}
            name={type}
            label={LABELS[type].title}
            description={LABELS[type].description}
            defaultChecked={initial[type]}
          />
        ))}
      </div>

      <Button type="submit" variant="secondary" size="sm" className="mt-5 w-full" loading={pending}>
        Save preferences
      </Button>
    </form>
  );
}
