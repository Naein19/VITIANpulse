import { createHash } from 'node:crypto';

/**
 * Deterministic UUIDs for seed data.
 *
 * Seeded rows must keep stable identifiers across restarts so bookmarks, follows
 * and links written during development remain valid. Derived from a namespace +
 * key hash and formatted as a valid v4-shaped UUID.
 */
export function seedId(namespace: string, key: string | number): string {
  const hex = createHash('sha256').update(`vitpulse:${namespace}:${key}`).digest('hex');
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
