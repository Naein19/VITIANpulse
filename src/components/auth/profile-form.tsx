'use client';

import { useActionState, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Field, FieldSet, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { updateProfile } from '@/server/actions/auth';
import { BRANCHES, SCHOOLS, type Branch, type School } from '@/types/domain';
import { branchToSchool } from '@/lib/ranking';

/**
 * Profile editor.
 *
 * Interests are submitted as repeated `interests` fields, which the server
 * action collects with `asArray` before Zod validates and caps them.
 */

const INTEREST_OPTIONS = [
  'ai', 'ml', 'webdev', 'opensource', 'security', 'ctf', 'robotics', 'iot', 'datascience',
  'design', 'photography', 'music', 'dance', 'drama', 'writing', 'literature', 'debate',
  'sports', 'chess', 'running', 'entrepreneurship', 'finance', 'placements', 'research',
  'hackathon', 'astronomy', 'sustainability', 'volunteering',
];

export function ProfileForm({
  initial,
}: {
  initial: {
    displayName: string;
    bio: string;
    branch: Branch | null;
    school: School | null;
    year: number | null;
    semester: number | null;
    interests: string[];
  };
}) {
  const { toast } = useToast();
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [branch, setBranch] = useState<string>(initial.branch ?? '');

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await updateProfile(null, formData);
      toast(result.ok ? 'Profile updated' : result.error, result.ok ? 'success' : 'error');
      return result;
    },
    null,
  );

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  // Pre-select the school implied by the branch, but leave it editable.
  const impliedSchool = branch ? branchToSchool(branch) : null;

  const toggleInterest = (value: string) =>
    setInterests((current) =>
      current.includes(value)
        ? current.filter((i) => i !== value)
        : current.length >= 12
          ? current
          : [...current, value],
    );

  return (
    <form action={formAction} className="space-y-7">
      {state && !state.ok && !state.fieldErrors && <Alert tone="danger">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">Your profile has been updated.</Alert>}

      <FieldSet legend="About you">
        <Field label="Display name" htmlFor="p-name" required error={errors.displayName}>
          <Input id="p-name" name="displayName" defaultValue={initial.displayName} required maxLength={60} />
        </Field>
        <Field
          label="Short bio"
          htmlFor="p-bio"
          description="Optional. Shown next to anything you post in discussions."
          error={errors.bio}
        >
          <Textarea id="p-bio" name="bio" rows={3} maxLength={280} defaultValue={initial.bio} />
        </Field>
      </FieldSet>

      <FieldSet
        legend="Academic details"
        description="These filter opportunities to the ones you are eligible for and rank events from your school higher."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch" htmlFor="p-branch" required error={errors.branch}>
            <Select
              id="p-branch"
              name="branch"
              required
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="" disabled>
                Select your branch
              </option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
          </Field>

          <Field label="School" htmlFor="p-school" description="Optional" error={errors.school}>
            <Select id="p-school" name="school" defaultValue={initial.school ?? impliedSchool ?? ''}>
              <option value="">Not specified</option>
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </Field>

          <Field label="Year" htmlFor="p-year" required error={errors.year}>
            <Select id="p-year" name="year" required defaultValue={initial.year ?? ''}>
              <option value="" disabled>Select</option>
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </Select>
          </Field>

          <Field label="Semester" htmlFor="p-sem" required error={errors.semester}>
            <Select id="p-sem" name="semester" required defaultValue={initial.semester ?? ''}>
              <option value="" disabled>Select</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </Select>
          </Field>
        </div>
      </FieldSet>

      <FieldSet legend="Interests" description={`Pick up to 12. Used to rank your feed. ${interests.length}/12 selected.`}>
        {interests.map((interest) => (
          <input key={interest} type="hidden" name="interests" value={interest} />
        ))}
        <div className="flex flex-wrap gap-1.5">
          {INTEREST_OPTIONS.map((option) => {
            const selected = interests.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleInterest(option)}
                aria-pressed={selected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                  selected
                    ? 'border-brand bg-brand-soft text-brand-ink'
                    : 'border-line bg-primary text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {selected && <Check className="size-3" aria-hidden="true" />}
                {option}
              </button>
            );
          })}
        </div>
      </FieldSet>

      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit" variant="primary" loading={pending}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
