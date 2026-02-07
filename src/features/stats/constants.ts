import type { MetricDef, MetricId } from './types';

export const KPI_METRICS: MetricId[] = ['hours', 'distance', 'mob_kills', 'creeper'];
export const VERSUS_MAX_METRICS = 12;

export const KPI_FALLBACK_DEFS: Record<string, MetricDef> = {
  hours: { label: 'Spielzeit', category: '\u00dcbersicht', unit: 'h', decimals: 2 },
  distance: { label: 'Distanz', category: '\u00dcbersicht', unit: 'km', decimals: 2 },
  mob_kills: { label: 'Kills', category: '\u00dcbersicht' },
  creeper: { label: 'Creeper get\u00f6tet', category: '\u00dcbersicht' },
};
