'use server';

import { revalidatePath } from 'next/cache';
import { getStore, getPrivilegedStore } from '@/server/db';
import { requirePermission, requireUser } from '@/server/auth/session';
import {
  PYQ_ALLOWED_MIME, PYQ_MAX_BYTES, pyqRequestSchema, pyqUploadSchema, uuid, type ActionResult,
} from '@/server/validation/schemas';
import { audit } from '@/server/db/repositories/admin';
import { getPyqPaperById } from '@/server/db/repositories/catalog';
import { notify } from '@/server/db/repositories/engagement';
import { trackSafe } from '@/server/db/repositories/analytics';
import { uploadPyqFile } from '@/server/storage/uploads';
import { action, currentVisitorHash, formToObject, limit } from './_shared';
import type { ContentStatus, PyqPaper, PyqSubject } from '@/types/domain';

/**
 * PYQ uploads and moderation.
 *
 * A student may upload; the paper enters PENDING_REVIEW and is invisible to
 * everyone else until an editor approves it. The file itself is validated for
 * MIME type, magic bytes and size before it reaches storage.
 */

export async function uploadPyqAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const user = await requirePermission('pyq:upload');
    await limit('upload:pyq', user.id);

    const input = pyqUploadSchema.parse(formToObject(formData));
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) throw new Error('Attach the question paper as a PDF.');
    if (file.size > PYQ_MAX_BYTES) throw new Error('That file is larger than 15 MB.');
    if (!PYQ_ALLOWED_MIME.includes(file.type as (typeof PYQ_ALLOWED_MIME)[number])) {
      throw new Error('Only PDF files are accepted.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Trust the bytes, not the declared type: a real PDF starts with "%PDF-".
    const magic = String.fromCharCode(...bytes.subarray(0, 5));
    if (magic !== '%PDF-') throw new Error('That file does not look like a PDF.');

    const store = await getStore();
    const subject = await ensureSubject(input);
    const fileUrl = await uploadPyqFile({
      bytes,
      subjectCode: input.subjectCode,
      examType: input.examType,
      year: input.year,
      uploaderId: user.id,
    });

    const now = new Date().toISOString();
    const created = await store.insert<PyqPaper>('pyq_papers', {
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      branch: input.branch,
      semester: input.semester,
      year: input.year,
      examType: input.examType,
      slot: input.slot,
      fileUrl,
      fileSizeBytes: file.size,
      pageCount: null,
      sourceKind: 'UPLOAD',
      externalId: null,
      status: 'PENDING_REVIEW',
      uploadedBy: user.id,
      downloadCount: 0,
      reportCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'PYQ_UPLOADED',
      entityType: 'pyq', entityId: created.id, detail: `${subject.code} ${input.examType} ${input.year}`,
    });

    revalidatePath('/admin/pyqs');
    return { id: created.id };
  });
}

/** Finds the subject, creating it if this is the first paper for that course. */
async function ensureSubject(input: {
  subjectCode: string;
  subjectName: string;
  branch: PyqSubject['branch'];
  semester: number;
  faculty: string | null;
}): Promise<PyqSubject> {
  const store = await getPrivilegedStore();
  const existing = await store.selectOne<PyqSubject>({
    table: 'pyq_subjects',
    filters: [{ op: 'eq', col: 'code', value: input.subjectCode }],
  });
  if (existing) return existing;

  return store.insert<PyqSubject>('pyq_subjects', {
    code: input.subjectCode,
    name: input.subjectName,
    branch: input.branch,
    semester: input.semester,
    credits: null,
    faculty: input.faculty,
    paperCount: 0,
  });
}

export async function reviewPyqAction(
  paperId: string,
  status: Extract<ContentStatus, 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'>,
): Promise<ActionResult<{ status: ContentStatus }>> {
  return action(async () => {
    const user = await requirePermission('pyq:approve');
    const paper = await getPyqPaperById(uuid.parse(paperId));
    if (!paper) throw new Error('That paper no longer exists.');

    const store = await getStore();
    await store.update<PyqPaper>('pyq_papers', paper.id, { status, updatedAt: new Date().toISOString() });

    if (status === 'PUBLISHED') {
      await store.increment('pyq_subjects', paper.subjectId, 'paperCount', 1);
      if (paper.uploadedBy) {
        await notify([
          {
            userId: paper.uploadedBy,
            type: 'PYQ_UPLOAD',
            title: 'Your paper upload was approved',
            body: `${paper.subjectCode} · ${paper.examType} ${paper.year} is now available to everyone.`,
            href: `/pyqs/${paper.branch.toLowerCase()}`,
          },
        ]);
      }
    }

    await audit({
      actorId: user.id, actorName: user.displayName, action: `PYQ_${status}`,
      entityType: 'pyq', entityId: paper.id, detail: `${paper.subjectCode} ${paper.examType} ${paper.year}`,
    });

    revalidatePath('/admin/pyqs');
    revalidatePath(`/pyqs/${paper.branch.toLowerCase()}`);
    return { status };
  });
}

export async function deletePyqAction(paperId: string): Promise<ActionResult<{ deleted: true }>> {
  return action(async () => {
    const user = await requirePermission('pyq:delete');
    const paper = await getPyqPaperById(uuid.parse(paperId));
    if (!paper) return { deleted: true as const };

    const store = await getStore();
    await store.delete('pyq_papers', paper.id);
    if (paper.status === 'PUBLISHED') {
      await store.increment('pyq_subjects', paper.subjectId, 'paperCount', -1);
    }

    await audit({
      actorId: user.id, actorName: user.displayName, action: 'PYQ_DELETED',
      entityType: 'pyq', entityId: paper.id,
    });

    revalidatePath('/admin/pyqs');
    return { deleted: true as const };
  });
}

export async function requestPyqAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const user = await requireUser();
    await limit('report:create', user.id);
    const input = pyqRequestSchema.parse(formToObject(formData));

    const store = await getPrivilegedStore();
    const created = await store.insert('pyq_requests', {
      ...input,
      requestedBy: user.id,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    });

    return { id: created.id };
  });
}

/** Records a download and returns the file URL to hand to the browser. */
export async function recordPyqDownloadAction(paperId: string): Promise<ActionResult<{ url: string }>> {
  return action(async () => {
    const paper = await getPyqPaperById(uuid.parse(paperId));
    if (!paper || paper.status !== 'PUBLISHED') throw new Error('That paper is not available.');

    const store = await getPrivilegedStore();
    await store.increment('pyq_papers', paper.id, 'downloadCount');

    await trackSafe({
      name: 'pyq_download',
      path: `/pyqs/${paper.branch.toLowerCase()}`,
      entityId: paper.id,
      visitorHash: await currentVisitorHash(),
      meta: { subject: paper.subjectCode, exam: paper.examType, year: paper.year },
    });

    return { url: paper.fileUrl };
  });
}
