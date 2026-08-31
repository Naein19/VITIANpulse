import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '@/lib/env';
import type { Branch, ExamType, PyqPaper } from '@/types/domain';

/**
 * PYQ Hub connector.
 *
 * The existing deployment at https://pyqs-hub.vercel.app is a Next.js + Supabase
 * application. It was probed during implementation and, as of writing:
 *
 *   - it exposes no public REST API (`/api/*` returns 404)
 *   - it serves its data by querying Supabase directly from the browser
 *   - its edge rules reject non-browser user agents
 *
 * Rather than inventing an API that does not exist, this module defines the
 * integration boundary and ships three implementations. The active one is chosen
 * by environment variables, so connecting the real hub later is configuration,
 * not a code change:
 *
 *   1. `supabase` — point VITPulse at the hub's own Supabase project with a
 *      read-only anon key. This is the intended production path: the hub already
 *      exposes these rows to any browser, so a server-side read with the same
 *      key is strictly narrower. Set PYQ_HUB_SUPABASE_URL, PYQ_HUB_SUPABASE_ANON_KEY
 *      and the table/column mapping variables.
 *   2. `rest` — if the hub later publishes `GET /api/papers`, set
 *      PYQ_HUB_API_URL (and optionally PYQ_HUB_API_TOKEN). The response is
 *      validated against `remotePaperSchema` before it is trusted.
 *   3. `none` (default) — VITPulse serves only its own moderated catalogue.
 *
 * In every mode, remote rows are mapped into the local `PyqPaper` shape and
 * marked `sourceKind: 'EXTERNAL'`, so the UI can label their origin and the
 * moderation tools know they are not locally owned.
 */

export type ConnectorMode = 'supabase' | 'rest' | 'none';

export interface PyqHubQuery {
  branch?: Branch;
  semester?: number;
  subjectCode?: string;
  search?: string;
  limit?: number;
}

export interface PyqHubConnector {
  readonly mode: ConnectorMode;
  readonly available: boolean;
  /** Human-readable status shown in the admin console. */
  describe(): string;
  fetchPapers(query: PyqHubQuery): Promise<PyqPaper[]>;
}

/* --------------------------------------------------------------- schemas */

/**
 * The shape a remote row must satisfy before VITPulse will render it.
 * Column names are configurable because the hub's schema is not ours to fix.
 */
const remotePaperSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  subject_code: z.string().min(1).max(24),
  subject_name: z.string().min(1).max(160),
  branch: z.string().min(1).max(24),
  semester: z.coerce.number().int().min(1).max(10),
  year: z.coerce.number().int().min(2000).max(2100),
  exam_type: z.string().min(1).max(24),
  slot: z.string().max(24).nullish(),
  file_url: z.string().url(),
  file_size: z.coerce.number().int().nonnegative().nullish(),
  created_at: z.string().nullish(),
});

type RemotePaper = z.infer<typeof remotePaperSchema>;

const KNOWN_EXAM_TYPES: readonly string[] = ['CAT1', 'CAT2', 'FAT', 'QUIZ', 'LAB', 'MAKEUP', 'RETEST'];

function normaliseExamType(value: string): ExamType {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (KNOWN_EXAM_TYPES.includes(upper)) return upper as ExamType;
  if (upper.includes('CAT') && upper.includes('1')) return 'CAT1';
  if (upper.includes('CAT') && upper.includes('2')) return 'CAT2';
  if (upper.startsWith('FAT') || upper.includes('FINAL')) return 'FAT';
  if (upper.includes('QUIZ')) return 'QUIZ';
  return 'FAT';
}

function normaliseBranch(value: string): Branch {
  const upper = value.toUpperCase().replace(/[\s_]/g, '-');
  const known: readonly string[] = [
    'CSE', 'CSE-AI', 'CSE-DS', 'CSE-CYBER', 'ECE', 'EEE', 'MECH', 'CIVIL',
    'BIOTECH', 'BBA', 'BCOM', 'BSC', 'LAW', 'DESIGN', 'MTECH', 'MBA', 'PHD',
  ];
  return (known.includes(upper) ? upper : 'CSE') as Branch;
}

function toLocalPaper(remote: RemotePaper): PyqPaper {
  const now = new Date().toISOString();
  return {
    // Namespaced so an external id can never collide with a local UUID.
    id: `ext:${remote.id}`,
    subjectId: `ext-subject:${remote.subject_code.toUpperCase()}`,
    subjectCode: remote.subject_code.toUpperCase(),
    subjectName: remote.subject_name,
    branch: normaliseBranch(remote.branch),
    semester: remote.semester,
    year: remote.year,
    examType: normaliseExamType(remote.exam_type),
    slot: remote.slot ?? null,
    fileUrl: remote.file_url,
    fileSizeBytes: remote.file_size ?? null,
    pageCount: null,
    sourceKind: 'EXTERNAL',
    externalId: remote.id,
    status: 'PUBLISHED',
    uploadedBy: null,
    downloadCount: 0,
    reportCount: 0,
    createdAt: remote.created_at ?? now,
    updatedAt: remote.created_at ?? now,
  };
}

/* ------------------------------------------------------------ connectors */

class NullConnector implements PyqHubConnector {
  readonly mode = 'none' as const;
  readonly available = false;
  describe(): string {
    return 'Not connected — VITPulse is serving only its own moderated paper catalogue. Set PYQ_HUB_SUPABASE_URL to mirror the PYQ Hub library.';
  }
  async fetchPapers(): Promise<PyqPaper[]> {
    return [];
  }
}

class SupabaseConnector implements PyqHubConnector {
  readonly mode = 'supabase' as const;
  readonly available = true;

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly table: string,
  ) {}

  describe(): string {
    return `Connected to the PYQ Hub Supabase project (table: ${this.table}), read-only.`;
  }

  async fetchPapers(query: PyqHubQuery): Promise<PyqPaper[]> {
    const client = createClient(this.url, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let request = client.from(this.table).select('*').limit(Math.min(200, query.limit ?? 60));
    if (query.branch) request = request.eq('branch', query.branch);
    if (query.semester) request = request.eq('semester', query.semester);
    if (query.subjectCode) request = request.eq('subject_code', query.subjectCode.toUpperCase());
    if (query.search) request = request.ilike('subject_name', `%${query.search}%`);

    const { data, error } = await request;
    if (error) throw new Error(`PYQ Hub read failed: ${error.message}`);

    // Validate every row: a schema change upstream must degrade to "fewer
    // papers", never to a runtime crash on a student's screen.
    return (data ?? []).flatMap((row) => {
      const parsed = remotePaperSchema.safeParse(row);
      return parsed.success ? [toLocalPaper(parsed.data)] : [];
    });
  }
}

class RestConnector implements PyqHubConnector {
  readonly mode = 'rest' as const;
  readonly available = true;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string | undefined,
  ) {}

  describe(): string {
    return `Connected to the PYQ Hub REST API at ${this.baseUrl}.`;
  }

  async fetchPapers(query: PyqHubQuery): Promise<PyqPaper[]> {
    const url = new URL(this.baseUrl);
    if (query.branch) url.searchParams.set('branch', query.branch);
    if (query.semester) url.searchParams.set('semester', String(query.semester));
    if (query.subjectCode) url.searchParams.set('subject', query.subjectCode);
    if (query.search) url.searchParams.set('q', query.search);
    url.searchParams.set('limit', String(Math.min(200, query.limit ?? 60)));

    const response = await fetch(url, {
      headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
      // Papers change rarely; an hour of caching keeps the hub's load trivial.
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`PYQ Hub responded ${response.status}`);

    const payload: unknown = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : [];

    return rows.flatMap((row) => {
      const parsed = remotePaperSchema.safeParse(row);
      return parsed.success ? [toLocalPaper(parsed.data)] : [];
    });
  }
}

let connector: PyqHubConnector | null = null;

export function getPyqHubConnector(): PyqHubConnector {
  if (connector) return connector;

  const supabaseUrl = process.env.PYQ_HUB_SUPABASE_URL;
  const supabaseKey = process.env.PYQ_HUB_SUPABASE_ANON_KEY;
  const table = process.env.PYQ_HUB_PAPERS_TABLE ?? 'papers';
  const restUrl = process.env.PYQ_HUB_API_URL;

  if (supabaseUrl && supabaseKey) {
    connector = new SupabaseConnector(supabaseUrl, supabaseKey, table);
  } else if (restUrl) {
    connector = new RestConnector(restUrl, env.PYQ_HUB_API_TOKEN);
  } else {
    connector = new NullConnector();
  }
  return connector;
}

/**
 * Fetches remote papers, degrading to an empty list on any failure.
 * The PYQ hub being down must never take a VITPulse page with it.
 */
export async function fetchExternalPapers(query: PyqHubQuery): Promise<PyqPaper[]> {
  const active = getPyqHubConnector();
  if (!active.available) return [];
  try {
    return await active.fetchPapers(query);
  } catch (error) {
    console.warn('[vitpulse] PYQ Hub fetch failed:', (error as Error).message);
    return [];
  }
}

/** The public URL of the standalone hub, linked from the PYQ section. */
export const PYQ_HUB_URL = env.PYQ_HUB_BASE_URL;

/** Test seam. */
export function __resetConnector(): void {
  connector = null;
}
