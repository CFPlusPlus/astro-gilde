import { describe, expect, it } from 'vitest';

import { filterMetricIds, groupMetricIds, pickDefaultRankMetricId } from './metric-utils';
import type { MetricDef } from './types';

describe('metric-utils', () => {
  const metrics: Record<string, MetricDef> = {
    hours: { label: 'Spielstunden', category: 'Allgemein', unit: 'h' },
    diamond: { label: 'Diamanten', category: 'Items' },
    king: { label: 'Server-Koenig', category: 'King' },
  };

  it('filters out king metric and applies query text', () => {
    expect(filterMetricIds(metrics, '')).toEqual(['hours', 'diamond']);
    expect(filterMetricIds(metrics, 'dia')).toEqual(['diamond']);
  });

  it('picks preferred default metric id', () => {
    expect(pickDefaultRankMetricId(['diamond', 'hours'], metrics)).toBe('hours');
    expect(pickDefaultRankMetricId(['diamond'], metrics)).toBe('diamond');
    expect(pickDefaultRankMetricId([], metrics)).toBeNull();
  });

  it('groups metric ids by category with sorted ids', () => {
    const grouped = groupMetricIds(metrics, ['diamond', 'hours']);
    expect(grouped).toEqual([
      { cat: 'Allgemein', ids: ['hours'] },
      { cat: 'Items', ids: ['diamond'] },
    ]);
  });
});
