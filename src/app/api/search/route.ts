import { NextResponse, type NextRequest } from 'next/server';
import { searchAll } from '@/server/db/repositories/search';
import { trackSafe, visitorHash } from '@/server/db/repositories/analytics';
import { checkRateLimit } from '@/lib/rate-limit';
import type { SearchEntity } from '@/types/domain';

/** Search endpoint backing the command palette. */

const VALID_ENTITIES: readonly SearchEntity[] = ['post', 'event', 'club', 'pyq', 'opportunity', 'resource'];

function fingerprint(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  return `${ip}|${request.headers.get('user-agent')?.slice(0, 80) ?? ''}`;
}

export async function GET(request: NextRequest) {
  const identity = fingerprint(request);
  const rate = checkRateLimit('search:query', identity);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many searches. Slow down for a moment.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
    );
  }

  const params = request.nextUrl.searchParams;
  const query = (params.get('q') ?? '').slice(0, 120);
  const limit = Math.min(20, Math.max(1, Number(params.get('limit')) || 8));
  const entityParam = params.get('entity');
  const entities =
    entityParam && VALID_ENTITIES.includes(entityParam as SearchEntity)
      ? ([entityParam] as SearchEntity[])
      : undefined;

  if (query.trim().length < 2) {
    return NextResponse.json({ hits: [], query }, { headers: { 'cache-control': 'no-store' } });
  }

  const hits = await searchAll(query, { limitPerEntity: limit, ...(entities ? { entities } : {}) });

  await trackSafe({
    name: 'search',
    path: '/search',
    entityId: null,
    visitorHash: visitorHash(identity),
    meta: { query: query.toLowerCase().slice(0, 60), results: hits.length },
  });

  return NextResponse.json(
    { hits, query, total: hits.length },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
