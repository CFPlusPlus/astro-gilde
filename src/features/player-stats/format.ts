import { formatDeNumber, formatDeNumber2 } from '../stats-core/format';

export const nf = (x: number) => formatDeNumber(x);

export const nf2 = (x: number) => formatDeNumber2(x);

export function norm(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export type ParsedQuery = { type: 'exact' | 'partial'; value: string };

/**
 * Filter parser behavior from legacy:
 * - comma = OR
 * - "..." = exact search on first column
 */
export function parseFilter(input: string): ParsedQuery[] {
  const raw = String(input || '').replace(
    /[\u201C\u201D\u201E\u201F\u00AB\u00BB\u201A\u201B\u2019"]/g,
    '"',
  );

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
