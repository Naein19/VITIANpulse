'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { uploadPyqAction } from '@/server/actions/pyq';
import { BRANCHES, EXAM_TYPES, EXAM_TYPE_LABEL } from '@/types/domain';

/**
 * Paper upload.
 *
 * The full pipeline runs on submit: Zod validation → PDF magic-byte check →
 * storage write → metadata row created as PENDING_REVIEW → editor queue. The
 * uploader is notified when their paper is approved.
 */
export function UploadPaperDialog({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await uploadPyqAction(null, formData);
      if (result.ok) {
        toast('Uploaded. An editor will review it before it goes live.', 'success');
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
      <Button variant="secondary" asChild>
        <a href="/login?next=/pyqs">
          <Upload className="size-3.5" aria-hidden="true" />
          Sign in to upload
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Upload className="size-3.5" aria-hidden="true" />
        Upload a paper
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload a question paper"
        description="It goes to an editor for review before appearing in the library."
        size="lg"
      >
        <form action={formAction} className="space-y-4">
          {state && !state.ok && !state.fieldErrors && <Alert tone="danger">{state.error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course code" htmlFor="pyq-code" required error={errors.subjectCode} description="For example CSE2004">
              <Input id="pyq-code" name="subjectCode" required maxLength={16} placeholder="CSE2004" autoComplete="off" />
            </Field>
            <Field label="Course name" htmlFor="pyq-name" required error={errors.subjectName}>
              <Input id="pyq-name" name="subjectName" required maxLength={120} placeholder="Database Management Systems" />
            </Field>
            <Field label="Branch" htmlFor="pyq-branch" required error={errors.branch}>
              <Select id="pyq-branch" name="branch" required defaultValue="CSE">
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </Select>
            </Field>
            <Field label="Semester" htmlFor="pyq-sem" required error={errors.semester}>
              <Select id="pyq-sem" name="semester" required defaultValue="1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Exam" htmlFor="pyq-exam" required error={errors.examType}>
              <Select id="pyq-exam" name="examType" required defaultValue="CAT1">
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>{EXAM_TYPE_LABEL[type]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Year" htmlFor="pyq-year" required error={errors.year}>
              <Select id="pyq-year" name="year" required defaultValue={String(currentYear)}>
                {Array.from({ length: 12 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </Field>
            <Field label="Slot" htmlFor="pyq-slot" description="Optional" error={errors.slot}>
              <Input id="pyq-slot" name="slot" maxLength={12} placeholder="A1" autoComplete="off" />
            </Field>
            <Field label="Faculty" htmlFor="pyq-faculty" description="Optional" error={errors.faculty}>
              <Input id="pyq-faculty" name="faculty" maxLength={90} placeholder="Dr. …" autoComplete="off" />
            </Field>
          </div>

          <Field
            label="Question paper (PDF)"
            htmlFor="pyq-file"
            required
            description="PDF only, up to 15 MB. Make sure the scan is readable and complete."
          >
            <Input
              id="pyq-file"
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="h-auto py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-tertiary file:px-2.5 file:py-1 file:text-[12.5px] file:font-medium file:text-soft"
            />
          </Field>

          <Field label="Anything the reviewer should know?" htmlFor="pyq-note" description="Optional" error={errors.note}>
            <Textarea id="pyq-note" name="note" rows={2} maxLength={400} placeholder="e.g. page 3 is slightly blurred" />
          </Field>

          <Alert tone="neutral">
            Only upload papers you are allowed to share. Do not upload answer keys, solutions bought from a third party,
            or anything watermarked as confidential.
          </Alert>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" loading={pending}>
              Submit for review
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
