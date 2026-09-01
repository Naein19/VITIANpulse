import { describe, expect, it } from 'vitest';
import {
  ACADEMIC_CALENDARS, CAMPUS_LOCATIONS, FALL_2026_FRESHERS, FALL_2026_SENIORS,
  OFFICIAL_LINKS, PROGRAMMES, SCHOOLS_INFO, UNIVERSITY, VITAP_CLUBS,
} from './vitap';
import { buildSeed } from '@/seed';
import { safeExternalUrl } from '@/lib/sanitize';

/**
 * These guard the boundary between real data and demo content. The demo seed is
 * built on top of this module, so a rename here silently orphans seed rows —
 * which is exactly what happened when the invented buildings were replaced with
 * the real ones and every event's `locationId` stopped resolving.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('campus locations', () => {
  it('has unique slugs and short names', () => {
    const slugs = CAMPUS_LOCATIONS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('keeps every plotted pin inside the plan', () => {
    for (const location of CAMPUS_LOCATIONS) {
      if (location.mapX === null || location.mapY === null) continue;
      expect(location.mapX).toBeGreaterThanOrEqual(0);
      expect(location.mapX).toBeLessThanOrEqual(100);
      expect(location.mapY).toBeGreaterThanOrEqual(0);
      expect(location.mapY).toBeLessThanOrEqual(100);
    }
  });

  it('pairs a coordinate with a source, a plan position and nothing invented', () => {
    for (const location of CAMPUS_LOCATIONS) {
      const hasCoords = location.lat !== null && location.lng !== null;
      // A coordinate without a named source would be an unsourced claim.
      expect(hasCoords).toBe(location.coordSource !== null);
      // And a plan position exists only where a real coordinate does.
      expect(location.mapX !== null).toBe(hasCoords);
      expect(location.mapY !== null).toBe(hasCoords);
      if (hasCoords) {
        expect(location.lat!).toBeGreaterThan(16.48);
        expect(location.lat!).toBeLessThan(16.51);
        expect(location.lng!).toBeGreaterThan(80.48);
        expect(location.lng!).toBeLessThan(80.52);
      }
    }
  });

  it('maps most of the campus, so the map is worth opening', () => {
    const placed = CAMPUS_LOCATIONS.filter((l) => l.lat !== null);
    expect(placed.length).toBeGreaterThanOrEqual(20);
  });

  it('publishes the campus coordinate that the map links to', () => {
    // Amaravati, Andhra Pradesh — a sanity band, not a precision check.
    expect(UNIVERSITY.coordinates.lat).toBeGreaterThan(16);
    expect(UNIVERSITY.coordinates.lat).toBeLessThan(17);
    expect(UNIVERSITY.coordinates.lng).toBeGreaterThan(80);
    expect(UNIVERSITY.coordinates.lng).toBeLessThan(81);
    expect(UNIVERSITY.mapsUrl).toContain(String(UNIVERSITY.coordinates.lat));
  });
});

describe('seed content references real places', () => {
  it('resolves every event location to a real campus location row', () => {
    const seed = buildSeed(new Date('2026-09-01T00:00:00Z'));
    // SeedTables is an index-signature map, so the keys read as possibly absent.
    const locationIds = new Set((seed.campus_locations ?? []).map((row) => row.id as string));
    const referenced = (seed.events ?? [])
      .map((event) => event.locationId as string | null)
      .filter((id): id is string => id !== null);

    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) expect(locationIds.has(id)).toBe(true);
  });
});

describe('academic calendars', () => {
  it('covers both audiences exactly once', () => {
    expect(ACADEMIC_CALENDARS.map((c) => c.audience).sort()).toEqual(['FRESHERS', 'SENIORS']);
  });

  it('uses well-formed dates that never run backwards', () => {
    for (const calendar of ACADEMIC_CALENDARS) {
      for (const entry of calendar.entries) {
        expect(entry.startsOn).toMatch(ISO_DATE);
        if (entry.endsOn) {
          expect(entry.endsOn).toMatch(ISO_DATE);
          expect(entry.endsOn >= entry.startsOn).toBe(true);
        }
      }
    }
  });

  it('starts freshers later than seniors, which is the whole reason for two calendars', () => {
    const seniorStart = FALL_2026_SENIORS.entries[0]?.startsOn ?? '';
    const fresherStart = FALL_2026_FRESHERS.entries[0]?.startsOn ?? '';
    expect(fresherStart > seniorStart).toBe(true);
  });

  it('gives seniors two CATs and freshers one', () => {
    const senior = FALL_2026_SENIORS.entries.filter((e) => e.description.startsWith('CAT'));
    const fresher = FALL_2026_FRESHERS.entries.filter((e) => e.description.startsWith('CAT'));
    expect(senior).toHaveLength(2);
    expect(fresher).toHaveLength(1);
  });

  it('ends instruction before the final assessment starts', () => {
    for (const calendar of ACADEMIC_CALENDARS) {
      const last = calendar.entries.find((e) => e.description.startsWith('Last Instructional day'));
      const fat = calendar.entries.find((e) => e.description === 'Theory FAT');
      expect(last).toBeDefined();
      expect(fat).toBeDefined();
      expect(fat!.startsOn >= last!.startsOn).toBe(true);
    }
  });
});

describe('reference lists', () => {
  it('links every programme to a real school', () => {
    const codes = new Set(SCHOOLS_INFO.map((s) => s.code));
    for (const programme of PROGRAMMES) expect(codes.has(programme.school)).toBe(true);
  });

  it('only publishes links that survive the URL allowlist', () => {
    for (const link of OFFICIAL_LINKS) expect(safeExternalUrl(link.url)).not.toBeNull();
  });

  it('names clubs uniquely', () => {
    const names = VITAP_CLUBS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
