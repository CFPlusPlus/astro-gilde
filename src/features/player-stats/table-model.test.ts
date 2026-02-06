import { describe, expect, it } from 'vitest';

import { parseFilter } from './format';
import { buildPlayerTables, filterPlayerTables, sortPlayerTables } from './table-model';

describe('player table model', () => {
  const stats: Record<string, unknown> = {
    'minecraft:custom': {
      'minecraft:play_time': 72_000,
      'minecraft:walk_one_cm': 100_000,
      'minecraft:mob_kills': 7,
    },
    'minecraft:mined': {
      'minecraft:stone': 5,
    },
    'minecraft:killed': {
      'minecraft:zombie': 3,
    },
  };

  const translations = {
    stats: {
      'minecraft:play_time': 'Spielzeit',
      'minecraft:walk_one_cm': 'Laufdistanz',
      'minecraft:mob_kills': 'Mob-Kills',
    },
    items: { 'minecraft:stone': 'Stein' },
    mobs: { 'minecraft:zombie': 'Zombie' },
  };

  it('builds transformed display values for known metrics', () => {
    const tables = buildPlayerTables(stats, true, translations);
    const playTime = tables.general.find((row) => row.raw === 'minecraft:play_time');
    const walk = tables.general.find((row) => row.raw === 'minecraft:walk_one_cm');

    expect(playTime?.display).toBe('1,00 h');
    expect(walk?.display).toBe('1,00 km');
  });

  it('sorts and filters rows by parsed query tokens', () => {
    const tables = buildPlayerTables(stats, true, translations);
    const sorted = sortPlayerTables(
      tables,
      { key: 'label', dir: 'asc' },
      { key: 'label', dir: 'asc' },
      { key: 'label', dir: 'asc' },
    );
    const filtered = filterPlayerTables(sorted, parseFilter('zombie'));

    expect(filtered.general.length).toBe(0);
    expect(filtered.items.length).toBe(0);
    expect(filtered.mobs).toHaveLength(1);
    expect(filtered.mobs[0].label).toBe('Zombie');
  });
});
