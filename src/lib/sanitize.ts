/**
 * Input sanitisation.
 *
 * VITPulse never renders user- or advertiser-supplied HTML. All rich text is
 * stored as plain text / lightweight markdown and rendered through React's
 * escaping (see <RichText/>), so `dangerouslySetInnerHTML` appears nowhere in
 * the codebase. These helpers add defence in depth at the write boundary.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/** Bidi overrides can be used to disguise a URL or a username. */
const BIDI_CHARS = /[\u202A-\u202E\u2066-\u2069]/g;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

/** Strips control/bidi characters and collapses runaway whitespace. */
export function sanitizePlainText(input: string, opts?: { maxLength?: number }): string {
  const cleaned = input
    .replace(CONTROL_CHARS, '')
    .replace(BIDI_CHARS, '')
    .replace(ZERO_WIDTH, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  const max = opts?.maxLength;
  return max && cleaned.length > max ? cleaned.slice(0, max).trimEnd() : cleaned;
}

/** Single-line variant - newlines become spaces. */
export function sanitizeLine(input: string, maxLength = 300): string {
  return sanitizePlainText(input.replace(/\n+/g, ' '), { maxLength }).replace(/\s{2,}/g, ' ');
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Returns a safe absolute URL, or null.
 * Rejects `javascript:`, `data:`, `vbscript:` and anything not on the allowlist,
 * which is what stops an advertiser turning a CTA into script execution.
 */
export function safeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  if (url.protocol !== 'mailto:' && !url.hostname) return null;
  return url.toString();
}

/**
 * Returns a safe *internal* path for redirects, or null.
 * Blocks protocol-relative (`//evil.com`) and absolute URLs, which is the
 * classic open-redirect vector on a `?next=` parameter.
 */
export function safeInternalPath(raw: string): string | null {
  const value = raw.trim();
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  CONTROL_CHARS.lastIndex = 0;
  if (CONTROL_CHARS.test(value)) {
    CONTROL_CHARS.lastIndex = 0;
    return null;
  }
  return value;
}

/** Deterministic, URL-safe slug. */
export function slugify(input: string, opts?: { maxLength?: number }): string {
  const max = opts?.maxLength ?? 72;
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return base || 'item';
}

/** Appends a short suffix until the slug is unique within `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const slug = slugify(base);
  if (!taken.has(slug)) return slug;
  for (let i = 2; i < 500; i += 1) {
    const candidate = `${slug}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/** Masks a contact value so it can be shown publicly without exposing it. */
export function maskContact(value: string, method: 'EMAIL' | 'PHONE' | 'IN_APP'): string {
  if (method === 'IN_APP') return 'Via VITPulse message';
  if (method === 'EMAIL') {
    const [name = '', domain = ''] = value.split('@');
    const head = name.slice(0, 2);
    return `${head}${'•'.repeat(Math.max(3, name.length - 2))}@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  return `${'•'.repeat(Math.max(0, digits.length - 3))}${digits.slice(-3)}`;
}
