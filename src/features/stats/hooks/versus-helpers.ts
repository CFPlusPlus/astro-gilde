import { VERSUS_MAX_METRICS } from '../constants';
import { getQuickVersusSelection, type VersusMetricDef } from '../versus';

export type VersusSummary = {
  winsA: number;
  winsB: number;
  ties: number;
  counted: number;
};

export function sanitizeVersusMetricIds(metricIds: string[] | undefined): string[] {
  return Array.from(new Set(metricIds || [])).slice(0, VERSUS_MAX_METRICS);
}

export function syncVersusMetricIdsWithCatalog(
  previous: string[],
  catalog: VersusMetricDef[],
): string[] {
  const available = new Set(catalog.map((entry) => entry.id));
  const filtered = previous.filter((id) => available.has(id));
  if (filtered.length > 0) return filtered.slice(0, VERSUS_MAX_METRICS);
  return getQuickVersusSelection(catalog).slice(0, VERSUS_MAX_METRICS);
}

export function summarizeVersusRows(
  rows: Array<{ valueA: number | null; valueB: number | null }>,
): VersusSummary {
  let winsA = 0;
  let winsB = 0;
  let ties = 0;
  let counted = 0;

  for (const row of rows) {
    if (row.valueA === null || row.valueB === null) continue;
    counted += 1;
    if (row.valueA > row.valueB) winsA += 1;
    else if (row.valueB > row.valueA) winsB += 1;
    else ties += 1;
  }

  return { winsA, winsB, ties, counted };
}
