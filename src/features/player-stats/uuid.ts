/**
 * UUID-Utils
 * - kompakt: ohne Bindestriche
 */

export function compactUUID(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '');
}
