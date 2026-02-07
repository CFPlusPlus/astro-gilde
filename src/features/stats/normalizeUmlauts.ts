export function normalizeUmlauts(input: string): string {
  return String(input ?? '')
    .replaceAll('Ae', '\u00c4')
    .replaceAll('Oe', '\u00d6')
    .replaceAll('Ue', '\u00dc')
    .replaceAll('ae', '\u00e4')
    .replaceAll('oe', '\u00f6')
    .replaceAll('ue', '\u00fc');
}
