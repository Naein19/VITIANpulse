import { NextResponse, type NextRequest } from 'next/server';
import { recordImpression } from '@/server/db/repositories/ads';
import { trackSafe, visitorHash } from '@/server/db/repositories/analytics';
import { checkRateLimit } from '@/lib/rate-limit';

/** Impression beacon, fired once an ad is actually visible in the viewport. */

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const identity = `${ip}|${request.headers.get('user-agent')?.slice(0, 80) ?? ''}`;

  if (!checkRateLimit('ad:event', identity).allowed) return new NextResponse(null, { status: 204 });

  const hash = visitorHash(identity);
  try {
    await recordImpression(id, hash);
    await trackSafe({ name: 'ad_impression', path: '/ads', entityId: id, visitorHash: hash, meta: {} });
  } catch (error) {
    console.warn('[vitpulse] impression failed:', (error as Error).message);
  }

  return new NextResponse(null, { status: 204 });
}
