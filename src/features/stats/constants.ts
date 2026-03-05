import type { MetricDef, MetricId } from './types';

export const STATS_PAGE_SIZES = [5, 10, 20, 30, 40] as const;
export const STATS_DEFAULT_PAGE_SIZE = 20;
export const KPI_METRICS: MetricId[] = ['hours', 'distance', 'mob_kills', 'creeper'];
export const VERSUS_MAX_METRICS = 12;
export const RANKINGS_TOP_CATEGORY_KEYS = [
  'hours',
  'distance',
  'mob_kills',
  'deaths',
  'mined',
  'crafted',
  'used',
  'broken',
] as const;

export const KPI_FALLBACK_DEFS: Record<string, MetricDef> = {
  hours: { label: 'Spielzeit', category: '\u00dcbersicht', unit: 'h', decimals: 2 },
  distance: {
    label: 'Zur\u00fcckgelegte Strecke',
    category: '\u00dcbersicht',
    unit: 'km',
    decimals: 2,
  },
  mob_kills: { label: 'Mobs get\u00f6tet', category: '\u00dcbersicht' },
  creeper: { label: 'Creeper get\u00f6tet', category: '\u00dcbersicht' },
};
