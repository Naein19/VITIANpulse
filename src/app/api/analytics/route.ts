import { NextResponse, type NextRequest } from 'next/server';
import { analyticsEventSchema } from '@/server/validation/schemas';
import { track, visitorHash } from '@/server/db/repositories/analytics';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Analytics ingest.
 *
 * Accepts only the event names in the schema, drops anything else, and never
 * reads or sets a cookie. The visitor hash is derived server-side from a coarse
 * request fingerprint plus a daily-rotating salt.
 */

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const identity = `${ip}|${request.headers.get('user-agent')?.slice(0, 80) ?? ''}`;

  const rate = checkRateLimit('analytics:ingest', identity);
  // Silently accept over-limit events: a 429 here would produce console noise
  // for users and tells a probe nothing useful.
  if (!rate.allowed) return new NextResponse(null, { status: 204 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const parsed = analyticsEventSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

  try {
    await track({ ...parsed.data, visitorHash: visitorHash(identity) });
  } catch (error) {
    console.warn('[vitpulse] analytics ingest failed:', (error as Error).message);
  }

  return new NextResponse(null, { status: 204 });
}
