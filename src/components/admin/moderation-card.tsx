'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { formatRelative, humanise } from '@/lib/format';
import { moderationActAction } from '@/server/actions/community';
import type { ReportWithContext } from '@/server/db/repositories/community';

/**
 * A single report with its resolution controls.
 *
 * Three outcomes, deliberately distinct: hide (recoverable), remove
 * (destructive) and dismiss (no action). The note is stored on the report so
 * the decision stays explainable later.
 */
export function ModerationCard({
  report,
  readOnly = false,
}: {
  report: ReportWithContext;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [action, setAction] = useState<string | null>(null);
  const now = Date.now();

  const [, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await moderationActAction(null, formData);
      if (result.ok) {
        toast('Report resolved', 'success');
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
      setAction(null);
      return result;
    },
    null,
  );

  return (
    <article className="rounded-md border border-line bg-primary p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="danger" size="xs">{humanise(report.reason)}</Badge>
        <Badge tone="outline" size="xs">{humanise(report.targetType)}</Badge>
        {readOnly && <Badge tone="success" size="xs">{humanise(report.status)}</Badge>}
        <time className="ml-auto text-[11.5px] text-faint" dateTime={report.createdAt}>
          {formatRelative(report.createdAt, now)}
        </time>
      </div>

      <h2 className="t-sm-strong text-ink">
        {report.targetHref ? (
          <Link href={report.targetHref} className="hover:underline underline-offset-2">
            {report.targetLabel}
          </Link>
        ) : (
          report.targetLabel
        )}
      </h2>

      {report.detail && (
        <p className="mt-1.5 rounded-sm border-l-2 border-line-strong bg-tertiary px-3 py-2 text-[12.5px] leading-relaxed text-soft">
          {report.detail}
        </p>
      )}

      <p className="mt-2 text-[11.5px] text-faint">
        Reported by {report.reporter?.displayName ?? 'a student'}
        {report.resolutionNote && ` · Resolution: ${report.resolutionNote}`}
      </p>

      {!readOnly && (
        <div className="mt-3 border-t border-line pt-3">
          {action ? (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="reportId" value={report.id} />
              <input type="hidden" name="action" value={action} />
              <Field
                label={`Note for ${action.replace(/_/g, ' ').toLowerCase()}`}
                htmlFor={`note-${report.id}`}
                description="Recorded on the report and in the audit log."
              >
                <Textarea id={`note-${report.id}`} name="note" rows={2} maxLength={400} autoFocus />
              </Field>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
                <Button
                  size="sm"
                  variant={action === 'REMOVE_CONTENT' ? 'danger' : 'primary'}
                  type="submit"
                  loading={pending}
                >
                  Confirm
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAction('HIDE_CONTENT')}>
                <EyeOff className="size-3.5" aria-hidden="true" />
                Hide
              </Button>
              <Button size="sm" variant="danger" onClick={() => setAction('REMOVE_CONTENT')}>
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAction('DISMISS')}>
                <X className="size-3.5" aria-hidden="true" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
