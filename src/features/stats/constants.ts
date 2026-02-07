import type { MetricDef, MetricId } from './types';

export const KPI_METRICS: MetricId[] = ['hours', 'distance', 'mob_kills', 'creeper'];
export const VERSUS_MAX_METRICS = 12;

export const KPI_FALLBACK_DEFS: Record<string, MetricDef> = {
  hours: { label: 'Spielzeit', category: 'Uebersicht', unit: 'h', decimals: 2 },
  distance: { label: 'Distanz', category: 'Uebersicht', unit: 'km', decimals: 2 },
  mob_kills: { label: 'Kills', category: 'Uebersicht' },
  creeper: { label: 'Creeper getoetet', category: 'Uebersicht' },
};
