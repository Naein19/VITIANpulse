import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hasSupabase } from '@/lib/env';
import { getSupabaseServiceClient, getSupabaseServerClient } from '@/server/supabase/clients';

/**
 * File storage.
 *
 * With Supabase configured, uploads go to a private bucket and are served
 * through short-lived signed URLs, so a paper cannot be hot-linked or scraped
 * from a guessable public path. Locally, files are written under
 * `public/uploads` so the same flow works end to end without credentials.
 */

export const PYQ_BUCKET = 'pyq-papers';
export const MEDIA_BUCKET = 'media';
const SIGNED_URL_TTL_SECONDS = 60 * 30;

export interface PyqUpload {
  bytes: Uint8Array;
  subjectCode: string;
  examType: string;
  year: number;
  uploaderId: string;
}

/** Deterministic, non-guessable object path that also groups papers usefully. */
function pyqObjectPath(upload: PyqUpload): string {
  const digest = createHash('sha256')
    .update(upload.bytes)
    .digest('hex')
    .slice(0, 16);
  return `${upload.subjectCode}/${upload.year}/${upload.examType}-${digest}.pdf`;
}

export async function uploadPyqFile(upload: PyqUpload): Promise<string> {
  const path = pyqObjectPath(upload);

  if (hasSupabase) {
    const client = getSupabaseServiceClient() ?? (await getSupabaseServerClient());
    const { error } = await client.storage.from(PYQ_BUCKET).upload(path, upload.bytes, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error && !error.message.includes('already exists')) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    // Store the object path; a signed URL is minted at read time.
    return `supabase://${PYQ_BUCKET}/${path}`;
  }

  const localDir = join(process.cwd(), 'public', 'uploads', 'pyq', upload.subjectCode, String(upload.year));
  await mkdir(localDir, { recursive: true });
  const fileName = path.split('/').pop()!;
  await writeFile(join(localDir, fileName), upload.bytes);
  return `/uploads/pyq/${upload.subjectCode}/${upload.year}/${fileName}`;
}

/**
 * Resolves a stored reference into a URL the browser can fetch.
 * `supabase://` references become short-lived signed URLs; everything else is
 * already a public path or an external link.
 */
export async function resolveFileUrl(reference: string): Promise<string> {
  if (!reference.startsWith('supabase://')) return reference;
  const [bucket, ...rest] = reference.replace('supabase://', '').split('/');
  if (!bucket || rest.length === 0) return reference;

  const client = getSupabaseServiceClient() ?? (await getSupabaseServerClient());
  const { data, error } = await client.storage.from(bucket).createSignedUrl(rest.join('/'), SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error('Could not generate a download link.');
  return data.signedUrl;
}

export interface MediaUpload {
  bytes: Uint8Array;
  contentType: string;
  kind: 'club-logo' | 'event-poster' | 'post-cover' | 'lost-found' | 'avatar';
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

/** Image magic numbers, checked so a renamed script cannot pose as an image. */
const IMAGE_SIGNATURES: Array<{ type: string; bytes: number[] }> = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

export function looksLikeImage(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/webp' || contentType === 'image/avif') {
    // Both are RIFF/ISO-BMFF containers; check the brand marker at offset 8.
    const marker = String.fromCharCode(...bytes.subarray(8, 12));
    return marker === 'WEBP' || marker === 'avif' || marker === 'heic';
  }
  return IMAGE_SIGNATURES.some(
    (sig) => sig.type === contentType && sig.bytes.every((b, i) => bytes[i] === b),
  );
}

export async function uploadMedia(upload: MediaUpload): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(upload.contentType)) throw new Error('Only JPEG, PNG, WebP or AVIF images are accepted.');
  if (upload.bytes.byteLength > MEDIA_MAX_BYTES) throw new Error('Images must be 5 MB or smaller.');
  if (!looksLikeImage(upload.bytes, upload.contentType)) throw new Error('That file is not a valid image.');

  const extension = upload.contentType.split('/')[1]!.replace('jpeg', 'jpg');
  const path = `${upload.kind}/${randomUUID()}.${extension}`;

  if (hasSupabase) {
    const client = getSupabaseServiceClient() ?? (await getSupabaseServerClient());
    const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, upload.bytes, {
      contentType: upload.contentType,
      upsert: false,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = client.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  const localDir = join(process.cwd(), 'public', 'uploads', upload.kind);
  await mkdir(localDir, { recursive: true });
  const fileName = path.split('/').pop()!;
  await writeFile(join(localDir, fileName), upload.bytes);
  return `/uploads/${upload.kind}/${fileName}`;
}
