import { z } from 'zod';
import {
  AD_PLACEMENTS, BRANCHES, CLUB_CATEGORIES, CONTENT_STATUSES, DISCUSSION_CATEGORIES,
  EVENT_CATEGORIES, EXAM_TYPES, IMPORTANCE, LOST_FOUND_KINDS, NOTIFICATION_TYPES,
  OPPORTUNITY_TYPES, POST_CATEGORIES, RECRUITMENT_STATUSES, REPORT_TARGETS,
  RESOURCE_CATEGORIES, ROLES, SCHOOLS, BOOKMARK_TYPES,
} from '@/types/domain';
import { safeExternalUrl, sanitizeLine, sanitizePlainText } from '@/lib/sanitize';

/**
 * Every mutation entering the system is parsed by one of these schemas.
 * Sanitisation happens *inside* the schema via `.transform`, so it is impossible
 * to persist a value that skipped it.
 */

const line = (max: number) =>
  z.string().trim().min(1).max(max).transform((v) => sanitizeLine(v, max));

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? sanitizeLine(v, max) : null));

const text = (max: number) =>
  z.string().trim().min(1).max(max).transform((v) => sanitizePlainText(v, { maxLength: max }));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? sanitizePlainText(v, { maxLength: max }) : null));

const externalUrl = z
  .string()
  .trim()
  .min(1, 'A link is required')
  .refine((value) => safeExternalUrl(value) !== null, 'Must be a valid http(s) or mailto link')
  .transform((value) => safeExternalUrl(value) as string);

const optionalExternalUrl = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? safeExternalUrl(v) : null))
  .refine((v) => v === null || typeof v === 'string', 'Must be a valid http(s) link');

const isoDateTime = z
  .string()
  .min(1, 'A date is required')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Not a valid date')
  .transform((v) => new Date(v).toISOString());

const optionalIso = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null));

const optionalUuid = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null));

const optionalInt = (min: number, max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    })
    .refine((v) => v === null || (v >= min && v <= max), `Must be between ${min} and ${max}`);

/** Comma or newline separated tag input, normalised and de-duplicated. */
export const tagsInput = z
  .string()
  .max(400)
  .default('')
  .transform((raw) =>
    Array.from(
      new Set(
        raw
          .split(/[,\n]/)
          .map((t) => sanitizeLine(t, 32).toLowerCase())
          .filter((t) => t.length > 1 && t.length <= 32),
      ),
    ).slice(0, 10),
  );

export const uuid = z.string().uuid('Invalid identifier');
export const slugParam = z.string().min(1).max(96).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');

/* ---------------------------------------------------------------- profile */

export const onboardingSchema = z.object({
  displayName: line(60),
  branch: z.enum(BRANCHES),
  school: z.enum(SCHOOLS).nullish().transform((v) => v ?? null),
  year: z.coerce.number().int().min(1).max(5),
  semester: z.coerce.number().int().min(1).max(10),
  interests: z.array(z.string().max(32)).max(12).default([]),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileUpdateSchema = onboardingSchema.extend({
  bio: optionalText(280),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/* ------------------------------------------------------------------ posts */

export const postSchema = z.object({
  title: line(140),
  summary: text(320),
  body: text(20_000),
  category: z.enum(POST_CATEGORIES),
  importance: z.enum(IMPORTANCE).default('NORMAL'),
  status: z.enum(CONTENT_STATUSES).default('DRAFT'),
  coverImageUrl: optionalExternalUrl,
  coverImageAlt: optionalLine(160),
  source: line(80).default('VITPulse Desk'),
  location: optionalLine(120),
  eventDate: optionalIso,
  clubId: optionalUuid,
  tags: tagsInput,
  pinned: z.coerce.boolean().default(false),
  expiresAt: optionalIso,
});
export type PostInput = z.infer<typeof postSchema>;

/* ----------------------------------------------------------------- events */

export const eventSchema = z
  .object({
    title: line(140),
    summary: text(320),
    description: text(20_000),
    category: z.enum(EVENT_CATEGORIES),
    status: z.enum(CONTENT_STATUSES).default('DRAFT'),
    posterUrl: optionalExternalUrl,
    posterAlt: optionalLine(160),
    clubId: optionalUuid,
    organiser: line(120),
    school: z.enum(SCHOOLS).nullish().transform((v) => v ?? null),
    venue: line(140),
    locationId: optionalUuid,
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    registrationRequired: z.coerce.boolean().default(false),
    registrationUrl: optionalExternalUrl,
    registrationDeadline: optionalIso,
    seats: optionalInt(0, 100_000),
    isPaid: z.coerce.boolean().default(false),
    feeInr: z.coerce.number().int().min(0).max(1_000_000).default(0),
    contactEmail: optionalLine(120),
    tags: tagsInput,
    featured: z.coerce.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.endsAt) < Date.parse(data.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End time must be after the start time' });
    }
    if (data.registrationDeadline && Date.parse(data.registrationDeadline) > Date.parse(data.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['registrationDeadline'],
        message: 'Registration must close before the event starts',
      });
    }
    if (data.isPaid && data.feeInr <= 0) {
      ctx.addIssue({ code: 'custom', path: ['feeInr'], message: 'A paid event needs a fee above zero' });
    }
    if (!data.isPaid && data.feeInr !== 0) {
      ctx.addIssue({ code: 'custom', path: ['feeInr'], message: 'A free event must have a zero fee' });
    }
  });
export type EventInput = z.infer<typeof eventSchema>;

/* ------------------------------------------------------------------ clubs */

export const clubSchema = z.object({
  name: line(90),
  shortName: line(24),
  category: z.enum(CLUB_CATEGORIES),
  tagline: line(140),
  description: text(8_000),
  logoUrl: optionalExternalUrl,
  bannerUrl: optionalExternalUrl,
  school: z.enum(SCHOOLS).nullish().transform((v) => v ?? null),
  email: optionalLine(120),
  facultyCoordinator: optionalLine(90),
  room: optionalLine(60),
  recruitmentStatus: z.enum(RECRUITMENT_STATUSES).default('CLOSED'),
  recruitmentUrl: optionalExternalUrl,
  recruitmentClosesAt: optionalIso,
  membershipInfo: optionalText(1_200),
});
export type ClubInput = z.infer<typeof clubSchema>;

/* ---------------------------------------------------------- opportunities */

export const opportunitySchema = z.object({
  title: line(140),
  organisation: line(120),
  type: z.enum(OPPORTUNITY_TYPES),
  summary: text(320),
  description: text(12_000),
  eligibility: text(1_200),
  location: line(120),
  remote: z.coerce.boolean().default(false),
  stipend: optionalLine(80),
  applyUrl: externalUrl,
  deadline: isoDateTime,
  status: z.enum(CONTENT_STATUSES).default('DRAFT'),
  tags: tagsInput,
  branches: z.array(z.enum(BRANCHES)).max(20).default([]),
  years: z.array(z.coerce.number().int().min(1).max(5)).max(5).default([]),
  logoUrl: optionalExternalUrl,
});
export type OpportunityInput = z.infer<typeof opportunitySchema>;

/* -------------------------------------------------------------- resources */

export const resourceSchema = z.object({
  title: line(140),
  description: text(600),
  category: z.enum(RESOURCE_CATEGORIES),
  url: externalUrl,
  fileType: optionalLine(12),
  contact: optionalLine(120),
  tags: tagsInput,
  status: z.enum(CONTENT_STATUSES).default('PUBLISHED'),
});
export type ResourceInput = z.infer<typeof resourceSchema>;

/* -------------------------------------------------------------------- PYQ */

/** Upload limits are enforced again server-side against the real byte length. */
export const PYQ_MAX_BYTES = 15 * 1024 * 1024;
export const PYQ_ALLOWED_MIME = ['application/pdf'] as const;

export const pyqUploadSchema = z.object({
  subjectCode: z
    .string()
    .trim()
    .min(3)
    .max(16)
    .regex(/^[A-Za-z0-9]+$/, 'Course code is letters and numbers only')
    .transform((v) => v.toUpperCase()),
  subjectName: line(120),
  branch: z.enum(BRANCHES),
  semester: z.coerce.number().int().min(1).max(10),
  year: z.coerce.number().int().min(2010).max(new Date().getFullYear() + 1),
  examType: z.enum(EXAM_TYPES),
  slot: optionalLine(12),
  faculty: optionalLine(90),
  note: z.string().trim().max(400).default('').transform((v) => sanitizePlainText(v, { maxLength: 400 })),
});
export type PyqUploadInput = z.infer<typeof pyqUploadSchema>;

export const pyqRequestSchema = z.object({
  subjectCode: z.string().trim().min(3).max(16).transform((v) => v.toUpperCase()),
  subjectName: line(120),
  branch: z.enum(BRANCHES),
  semester: z.coerce.number().int().min(1).max(10),
  detail: text(500),
});
export type PyqRequestInput = z.infer<typeof pyqRequestSchema>;

/* -------------------------------------------------------------------- ads */

export const adSchema = z
  .object({
    clubId: uuid,
    name: line(90),
    headline: line(80),
    body: text(240),
    ctaLabel: line(28),
    ctaUrl: externalUrl,
    imageUrl: optionalExternalUrl,
    imageAlt: optionalLine(160),
    placement: z.enum(AD_PLACEMENTS),
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    priority: z.coerce.number().int().min(0).max(100).default(10),
    impressionCap: optionalInt(100, 10_000_000),
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.endsAt) <= Date.parse(data.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'The campaign must end after it starts' });
    }
    const days = (Date.parse(data.endsAt) - Date.parse(data.startsAt)) / 86_400_000;
    if (days > 120) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Campaigns can run for at most 120 days' });
    }
  });
export type AdInput = z.infer<typeof adSchema>;

export const adReviewSchema = z.object({
  adId: uuid,
  decision: z.enum(['APPROVED', 'REJECTED', 'PAUSED', 'ENDED']),
  note: optionalText(400),
});

/* -------------------------------------------------------------- community */

export const discussionSchema = z.object({
  title: line(160),
  body: text(6_000),
  category: z.enum(DISCUSSION_CATEGORIES),
});
export type DiscussionInput = z.infer<typeof discussionSchema>;

export const commentSchema = z.object({
  targetType: z.enum(['DISCUSSION', 'POST', 'EVENT']),
  targetId: uuid,
  parentId: optionalUuid,
  body: text(2_000),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const lostFoundSchema = z
  .object({
    kind: z.enum(LOST_FOUND_KINDS),
    title: line(120),
    description: text(1_200),
    imageUrl: optionalExternalUrl,
    locationText: line(120),
    happenedOn: isoDateTime,
    contactMethod: z.enum(['EMAIL', 'PHONE', 'IN_APP']),
    contactValue: z.string().trim().max(120).default(''),
  })
  .superRefine((data, ctx) => {
    if (data.contactMethod === 'EMAIL' && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(data.contactValue)) {
      ctx.addIssue({ code: 'custom', path: ['contactValue'], message: 'Enter a valid email address' });
    }
    if (data.contactMethod === 'PHONE' && data.contactValue.replace(/\D/g, '').length < 10) {
      ctx.addIssue({ code: 'custom', path: ['contactValue'], message: 'Enter a valid phone number' });
    }
  });
export type LostFoundInput = z.infer<typeof lostFoundSchema>;

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().min(1).max(64),
  reason: z.enum(['SPAM', 'HARASSMENT', 'MISINFORMATION', 'INAPPROPRIATE', 'WRONG_INFO', 'OTHER']),
  detail: optionalText(500),
});
export type ReportInput = z.infer<typeof reportSchema>;

/* --------------------------------------------------------- engagement etc */

export const bookmarkSchema = z.object({
  targetType: z.enum(BOOKMARK_TYPES),
  targetId: z.string().min(1).max(64),
});

export const notificationPrefsSchema = z.object(
  Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, z.coerce.boolean().default(true)])) as Record<
    (typeof NOTIFICATION_TYPES)[number],
    z.ZodDefault<z.ZodCoercedBoolean<unknown>>
  >,
);

export const roleAssignSchema = z.object({
  userId: uuid,
  role: z.enum(ROLES),
});

export const suspendSchema = z.object({
  userId: uuid,
  suspended: z.coerce.boolean(),
  reason: optionalLine(240),
});

export const moderationActionSchema = z.object({
  reportId: uuid,
  action: z.enum(['HIDE_CONTENT', 'DISMISS', 'REMOVE_CONTENT', 'WARN']),
  note: optionalText(400),
});

export const analyticsEventSchema = z.object({
  name: z.enum([
    'page_view', 'post_view', 'event_view', 'event_register_click', 'pyq_download',
    'search', 'bookmark', 'club_follow', 'ad_impression', 'ad_click', 'resource_click',
    'opportunity_click',
  ]),
  path: z.string().max(300).default('/'),
  entityId: z.string().max(64).nullish().transform((v) => v ?? null),
  meta: z
    .record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()]))
    .default({}),
});

/** Shared shape returned by every server action. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
