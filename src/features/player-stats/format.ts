export const nf = (x: number) => new Intl.NumberFormat('de-DE').format(x);

export const nf2 = (x: number) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(x);

export function norm(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export type ParsedQuery = { type: 'exact' | 'partial'; value: string };

/**
 * Filter-Parsen wie in der Legacy-Version:
 * - Komma = ODER
 * - "..." = exakte Suche in der ersten Spalte
 */
export function parseFilter(input: string): ParsedQuery[] {
  const raw = String(input || '').replace(/[“”„‟«»‚‛’"]/g, '"');

  return raw
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean)
    .map((q) =>
      q.startsWith('"') && q.endsWith('"') && q.length > 1
        ? { type: 'exact', value: norm(q.slice(1, -1)) }
        : { type: 'partial', value: norm(q) },
    );
}

export function matchQueries(queries: ParsedQuery[], label: string, rowText: string): boolean {
  if (queries.length === 0) return true;
  const labelN = norm(label);
  const rowN = norm(rowText);
  return queries.some((q) => (q.type === 'exact' ? labelN === q.value : rowN.includes(q.value)));
}
