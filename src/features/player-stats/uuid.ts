/**
 * UUID-Utils
 * - kompakt: ohne Bindestriche
 * - pretty: mit Bindestrichen
 */

export function compactUUID(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '');
}

export function prettyUUID(c32: string): string {
  if (c32.length !== 32) return c32;
  return `${c32.slice(0, 8)}-${c32.slice(8, 12)}-${c32.slice(12, 16)}-${c32.slice(16, 20)}-${c32.slice(20)}`;
}
