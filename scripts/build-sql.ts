/**
 * Generates the copy-paste SQL bundle in `sql/`.
 *
 * Two things live in that folder, and neither is written by hand:
 *
 *   - The migrations from `supabase/migrations/`, copied verbatim and numbered
 *     for the Supabase SQL editor. Copying rather than duplicating means the
 *     migrations stay the single source of truth and the bundle cannot drift.
 *   - `05_reference_data.sql`, generated from `src/data/vitap.ts`, so the real
 *     campus locations, clubs and official links land in a fresh project
 *     without anyone retyping them.
 *
 * Run with `npm run db:sql`.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAMPUS_LOCATIONS, OFFICIAL_LINKS, VITAP_CLUBS, VERIFIED_ON } from '../src/data/vitap';
import { slugify } from '../src/lib/sanitize';

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const OUT = join(ROOT, 'sql');

/** Single-quoted SQL literal, or NULL. */
function lit(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${value.replace(/'/g, "''")}'`;
}

/** Postgres text[] literal. */
function arr(values: readonly string[]): string {
  if (values.length === 0) return `'{}'`;
  return `array[${values.map((v) => lit(v)).join(', ')}]`;
}

function header(title: string, body: string): string {
  const rule = '='.repeat(77);
  return `-- ${rule}\n-- ${title}\n--\n${body
    .split('\n')
    .map((line) => `-- ${line}`.trimEnd())
    .join('\n')}\n-- ${rule}\n`;
}

/* ------------------------------------------------------------ reference data */

function referenceData(): string {
  const locations = CAMPUS_LOCATIONS.map(
    (l) => `  (${[
      lit(l.slug), lit(l.name), lit(l.shortName), lit(l.category), lit(l.description),
      lit(l.timings), lit(l.contact), lit(l.mapX), lit(l.mapY), lit(l.lat), lit(l.lng),
      lit(l.levels), lit(l.coordSource), arr(l.tags),
    ].join(', ')})`,
  ).join(',\n');

  const clubs = VITAP_CLUBS.map((c) => {
    const slug = slugify(c.name);
    const description = `${c.tagline} A registered student club at VIT-AP, listed under ${c.officialGroup} on the university's clubs and chapters page.`;
    return `  (${[
      lit(slug), lit(c.name), lit(c.shortName), lit(c.category), lit(c.tagline),
      lit(description), lit(true), lit('PUBLISHED'),
    ].join(', ')})`;
  }).join(',\n');

  const resources = OFFICIAL_LINKS.map(
    (r) => `  (${[
      lit(slugify(r.title)), lit(r.title), lit(r.description), lit(r.category),
      lit(r.url), lit(true), lit(r.fileType), lit('PUBLISHED'),
    ].join(', ')})`,
  ).join(',\n');

  return `${header(
    'Reference data — real VIT-AP institutional records',
    `Generated from src/data/vitap.ts. Do not edit by hand: run \`npm run db:sql\`.

Everything here is fact taken from VIT-AP's own public pages and from
OpenStreetMap (ODbL) — campus locations with real coordinates, the registered
clubs and chapters, and the official portal links. It is NOT demo content.
Last verified: ${VERIFIED_ON}.

Safe to re-run: every statement upserts on the natural key.`,
  )}
insert into campus_locations
  (slug, name, short_name, category, description, timings, contact,
   map_x, map_y, lat, lng, levels, coord_source, tags)
values
${locations}
on conflict (slug) do update set
  name         = excluded.name,
  short_name   = excluded.short_name,
  category     = excluded.category,
  description  = excluded.description,
  timings      = excluded.timings,
  contact      = excluded.contact,
  map_x        = excluded.map_x,
  map_y        = excluded.map_y,
  lat          = excluded.lat,
  lng          = excluded.lng,
  levels       = excluded.levels,
  coord_source = excluded.coord_source,
  tags         = excluded.tags;


insert into clubs (slug, name, short_name, category, tagline, description, verified, status)
values
${clubs}
on conflict (slug) do update set
  name        = excluded.name,
  short_name  = excluded.short_name,
  category    = excluded.category,
  tagline     = excluded.tagline,
  description = excluded.description,
  verified    = excluded.verified;


insert into resources (slug, title, description, category, url, external, file_type, status)
values
${resources}
on conflict (slug) do update set
  title       = excluded.title,
  description = excluded.description,
  category    = excluded.category,
  url         = excluded.url,
  file_type   = excluded.file_type;
`;
}

/* ---------------------------------------------------------------------- main */

const migrations = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
mkdirSync(OUT, { recursive: true });

const parts: Array<{ file: string; sql: string }> = [];

for (const [index, file] of migrations.entries()) {
  const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
  const target = `0${index + 1}_${name}.sql`;
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  parts.push({ file: target, sql });
}

parts.push({ file: '05_reference_data.sql', sql: referenceData() });

for (const part of parts) writeFileSync(join(OUT, part.file), part.sql);

const combined = [
  header(
    'VITPulse — complete database install',
    `Every file in this folder, concatenated in order, for a single paste into
the Supabase SQL editor. Running the numbered files one at a time is easier
to debug; this one is for when you know it works.

Generated by \`npm run db:sql\`. Do not edit.`,
  ),
  ...parts.map((p) => `\n\n-- >>> ${p.file} ${'-'.repeat(Math.max(0, 60 - p.file.length))}\n\n${p.sql}`),
].join('');

writeFileSync(join(OUT, '00_all_in_one.sql'), combined);

const lines = combined.split('\n').length;
console.log(`sql/ written — ${parts.length + 1} files, ${lines} lines total`);
for (const part of parts) console.log(`  ${part.file}`);
console.log('  00_all_in_one.sql');
