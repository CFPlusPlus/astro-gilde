import { describe, expect, it } from 'vitest';

import { VERSUS_MAX_METRICS } from '../constants';
import type { VersusMetricDef } from '../versus';
import {
  sanitizeVersusMetricIds,
  summarizeVersusRows,
  syncVersusMetricIdsWithCatalog,
} from './versus-helpers';

function makeDef(id: string, group = 'Allgemein'): VersusMetricDef {
  return {
    id,
    label: id,
    group,
    kind: 'stat',
    key: id,
  };
}

describe('versus-helpers', () => {
  it('sanitizeVersusMetricIds deduplicates and caps to max metrics', () => {
    const many = Array.from({ length: VERSUS_MAX_METRICS + 5 }, (_, i) => `metric:${i}`);
    const input = ['metric:0', 'metric:1', 'metric:0', ...many];

    const result = sanitizeVersusMetricIds(input);

    expect(result).toHaveLength(VERSUS_MAX_METRICS);
    expect(result[0]).toBe('metric:0');
    expect(result[1]).toBe('metric:1');
  });

  it('syncVersusMetricIdsWithCatalog keeps matching previous selection', () => {
    const previous = ['stat:a', 'stat:c', 'stat:b'];
    const catalog = [makeDef('stat:a'), makeDef('stat:b')];

    const result = syncVersusMetricIdsWithCatalog(previous, catalog);

    expect(result).toEqual(['stat:a', 'stat:b']);
  });

  it('syncVersusMetricIdsWithCatalog falls back to quick selection', () => {
    const previous = ['stat:unknown'];
    const catalog = [
      makeDef('stat:a', 'Allgemein'),
      makeDef('stat:b', 'Allgemein'),
      makeDef('stat:c', 'Allgemein'),
      makeDef('stat:d', 'Allgemein'),
      makeDef('stat:e', 'Allgemein'),
      makeDef('item:x', 'Gegenstaende'),
    ];

    const result = syncVersusMetricIdsWithCatalog(previous, catalog);

    expect(result).toEqual(['stat:a', 'stat:b', 'stat:c', 'stat:d']);
  });

  it('summarizeVersusRows counts wins, ties and ignores missing values', () => {
    const result = summarizeVersusRows([
      { valueA: 10, valueB: 5 },
      { valueA: 3, valueB: 9 },
      { valueA: 4, valueB: 4 },
      { valueA: null, valueB: 7 },
      { valueA: 2, valueB: null },
    ]);

    expect(result).toEqual({
      winsA: 1,
      winsB: 1,
      ties: 1,
      counted: 3,
    });
  });
});
