'use client';

import { useActionState, useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Select, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { createReportAction } from '@/server/actions/community';
import type { ReportTarget } from '@/types/domain';

const REASONS = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'MISINFORMATION', label: 'Misleading information' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'WRONG_INFO', label: 'Incorrect details' },
  { value: 'OTHER', label: 'Something else' },
] as const;

/**
 * Report control.
 *
 * Available on every user-visible entity. Reports go to the moderation queue,
 * are de-duplicated per user per item, and are rate limited to ten an hour.
 */
export function ReportButton({
  targetType,
  targetId,
  signedIn,
  label = 'Report',
}: {
  targetType: ReportTarget;
  targetId: string;
  signedIn: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await createReportAction(null, formData);
      if (result.ok) {
        toast('Report sent to the moderation team. Thank you.', 'success');
        setOpen(false);
      } else {
        toast(result.error, 'error');
      }
      return result;
    },
    null,
  );

  if (!signedIn) {
    return (
      <Button size="sm" variant="ghost" asChild>
        <a href="/login">
          <Flag className="size-3.5" aria-hidden="true" />
          {label}
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Flag className="size-3.5" aria-hidden="true" />
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report this content"
        description="A moderator will review it. Reports are not visible to the person who posted."
        size="sm"
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />

          <Field label="What is wrong with it?" htmlFor="report-reason" required>
            <Select id="report-reason" name="reason" defaultValue="SPAM" required>
              {REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Anything else the moderator should know?"
            htmlFor="report-detail"
            description="Optional. Keep it factual — this goes into the moderation record."
            error={state && !state.ok ? state.fieldErrors?.detail : undefined}
          >
            <Textarea id="report-detail" name="detail" rows={3} maxLength={500} placeholder="Optional context…" />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)} size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={pending}>
              Send report
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
