'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { createLostFoundAction } from '@/server/actions/community';

/** Report a lost or found item. Goes to the moderation queue before publishing. */
export function NewLostFoundDialog({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState('IN_APP');
  const router = useRouter();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await createLostFoundAction(null, formData);
      if (result.ok) {
        toast('Submitted — a moderator will publish it shortly.', 'success');
        setOpen(false);
        router.refresh();
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
        <a href="/login?next=/lost-found">
          <Plus className="size-3.5" aria-hidden="true" />
          Sign in to post
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" aria-hidden="true" />
        Post a listing
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Lost or found something?"
        description="A moderator reviews every listing before it appears."
        size="lg"
      >
        <form action={formAction} className="space-y-4">
          {state && !state.ok && !state.fieldErrors && <Alert tone="danger">{state.error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="lf-kind" required error={errors.kind}>
              <Select id="lf-kind" name="kind" required defaultValue="LOST">
                <option value="LOST">I lost something</option>
                <option value="FOUND">I found something</option>
              </Select>
            </Field>
            <Field label="When" htmlFor="lf-date" required error={errors.happenedOn}>
              <Input id="lf-date" name="happenedOn" type="date" required max={today} defaultValue={today} />
            </Field>
          </div>

          <Field label="What is it?" htmlFor="lf-title" required error={errors.title}>
            <Input id="lf-title" name="title" required maxLength={120} placeholder="Blue steel water bottle with a sticker" />
          </Field>

          <Field
            label="Description"
            htmlFor="lf-desc"
            required
            description="Leave out one identifying detail so you can verify the real owner."
            error={errors.description}
          >
            <Textarea id="lf-desc" name="description" rows={4} required maxLength={1200} />
          </Field>

          <Field label="Where" htmlFor="lf-loc" required error={errors.locationText}>
            <Input id="lf-loc" name="locationText" required maxLength={120} placeholder="AB-2 corridor, ground floor" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How should people reach you?" htmlFor="lf-method" required>
              <Select
                id="lf-method"
                name="contactMethod"
                required
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="IN_APP">Through VITPulse (recommended)</option>
                <option value="EMAIL">Email address</option>
                <option value="PHONE">Phone number</option>
              </Select>
            </Field>
            <Field
              label={method === 'PHONE' ? 'Phone number' : method === 'EMAIL' ? 'Email address' : 'Contact'}
              htmlFor="lf-contact"
              description={method === 'IN_APP' ? 'Your account email is used automatically.' : 'Only shown to signed-in students.'}
              error={errors.contactValue}
            >
              <Input
                id="lf-contact"
                name="contactValue"
                maxLength={120}
                disabled={method === 'IN_APP'}
                placeholder={method === 'PHONE' ? '9xxxxxxxxx' : 'you@vitapstudent.ac.in'}
              />
            </Field>
          </div>

          <Alert tone="neutral">
            Do not post anyone else&rsquo;s contact details. Hand ID cards and high-value items to the security control room
            rather than arranging a private handover.
          </Alert>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" loading={pending}>Submit for review</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
