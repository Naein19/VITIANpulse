import { NextResponse, type NextRequest } from 'next/server';
import { recordClick } from '@/server/db/repositories/ads';
import { trackSafe, visitorHash } from '@/server/db/repositories/analytics';
import { safeExternalUrl } from '@/lib/sanitize';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Ad click-through.
 *
 * Clicks route through here rather than linking straight to the advertiser so
 * the destination is re-validated at click time (an advertiser could have edited
 * the campaign since render) and the click is counted exactly once per visitor
 * per minute. Redirects are 302 so they are never cached.
 */

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const identity = `${ip}|${request.headers.get('user-agent')?.slice(0, 80) ?? ''}`;

  if (!checkRateLimit('ad:event', identity).allowed) {
    return NextResponse.redirect(new URL('/', request.url), 302);
  }

  const hash = visitorHash(identity);
  const destination = await recordClick(id, hash);

  // Re-validate the protocol even though the schema checked it on write.
  const safe = destination ? safeExternalUrl(destination) : null;
  if (!safe) return NextResponse.redirect(new URL('/', request.url), 302);

  await trackSafe({ name: 'ad_click', path: '/ads', entityId: id, visitorHash: hash, meta: {} });

  const response = NextResponse.redirect(safe, 302);
  response.headers.set('cache-control', 'no-store');
  // Do not leak the referring VITPulse page to the advertiser.
  response.headers.set('referrer-policy', 'no-referrer');
  return response;
}
