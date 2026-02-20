import { describe, expect, it } from 'vitest';

import { getQuickVersusSelection, getVersusKpiSelection, type VersusMetricDef } from './versus';

function makeDef({
  id,
  label = id,
  group = 'Allgemein',
  kind = 'stat',
}: {
  id: string;
  label?: string;
  group?: string;
  kind?: VersusMetricDef['kind'];
}): VersusMetricDef {
  return {
    id,
    label,
    group,
    kind,
    key: id,
    section: kind === 'mob' ? 'minecraft:killed' : undefined,
  };
}

describe('versus', () => {
  it('prefers stable KPI metrics for versus selection', () => {
    const catalog: VersusMetricDef[] = [
      makeDef({ id: 'stat:minecraft:play_time', label: 'Spielzeit' }),
      makeDef({ id: 'stat:minecraft:walk_one_cm', label: 'Laufdistanz' }),
      makeDef({ id: 'stat:minecraft:mob_kills', label: 'Mob-Kills' }),
      makeDef({
        id: 'mob:killed:minecraft:creeper',
        label: 'Creeper (Getoetet)',
        group: 'Kreaturen - Getoetet',
        kind: 'mob',
      }),
      makeDef({ id: 'stat:minecraft:deaths', label: 'Tode' }),
    ];

    expect(getVersusKpiSelection(catalog)).toEqual([
      'stat:minecraft:play_time',
      'stat:minecraft:walk_one_cm',
      'stat:minecraft:mob_kills',
      'mob:killed:minecraft:creeper',
    ]);
  });

  it('falls back to first general entries if preferred metrics are missing', () => {
    const catalog: VersusMetricDef[] = [
      makeDef({ id: 'stat:a' }),
      makeDef({ id: 'stat:b' }),
      makeDef({ id: 'stat:c' }),
      makeDef({ id: 'stat:d' }),
      makeDef({ id: 'item:x', group: 'Gegenstaende', kind: 'item' }),
    ];

    expect(getVersusKpiSelection(catalog)).toEqual(['stat:a', 'stat:b', 'stat:c', 'stat:d']);
    expect(getQuickVersusSelection(catalog)).toEqual(['stat:a', 'stat:b', 'stat:c', 'stat:d']);
  });
});
