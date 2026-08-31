'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { createDiscussionAction } from '@/server/actions/community';
import { DISCUSSION_CATEGORIES } from '@/types/domain';
import { humanise } from '@/lib/format';

/** Start a thread. Rate limited to six threads per five minutes, server-side. */
export function NewDiscussionDialog({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await createDiscussionAction(null, formData);
      if (result.ok) {
        toast('Thread posted', 'success');
        setOpen(false);
        router.push(`/discussions/${result.data.slug}`);
      } else {
        toast(result.error, 'error');
      }
      return result;
    },
    null,
  );

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  if (!signedIn) {
    return (
      <Button variant="primary" asChild>
        <a href="/login?next=/discussions">
          <PenLine className="size-3.5" aria-hidden="true" />
          Sign in to post
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <PenLine className="size-3.5" aria-hidden="true" />
        Start a thread
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Start a discussion"
        description="Ask something other students can actually answer from experience."
        size="lg"
      >
        <form action={formAction} className="space-y-4">
          {state && !state.ok && !state.fieldErrors && <Alert tone="danger">{state.error}</Alert>}

          <Field label="Question" htmlFor="d-title" required error={errors.title}>
            <Input
              id="d-title"
              name="title"
              required
              maxLength={160}
              placeholder="Which fifth-semester elective is actually worth taking?"
            />
          </Field>

          <Field label="Category" htmlFor="d-category" required error={errors.category}>
            <Select id="d-category" name="category" required defaultValue="GENERAL">
              {DISCUSSION_CATEGORIES.map((c) => (
                <option key={c} value={c}>{humanise(c)}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Details"
            htmlFor="d-body"
            required
            description="At least a couple of sentences — context is what gets you a useful answer."
            error={errors.body}
          >
            <Textarea
              id="d-body"
              name="body"
              rows={6}
              required
              minLength={40}
              maxLength={6000}
              placeholder="What have you already tried or already read? What specifically are you stuck on?"
            />
          </Field>

          <Alert tone="neutral">
            Your name is attached to this thread. Keep it civil and specific — threads that are just links or venting
            get removed.
          </Alert>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" loading={pending}>Post thread</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
