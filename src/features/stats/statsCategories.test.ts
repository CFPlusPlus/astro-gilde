import { describe, expect, it } from 'vitest';

import { resolveStatsCategoryDef } from './statsCategories';

describe('statsCategories', () => {
  it('resolves override entries with canonical labels', () => {
    const category = resolveStatsCategoryDef('hours', {
      label: 'Spielstunden',
      category: 'Allgemein',
      unit: 'h',
    });

    expect(category).toEqual({
      key: 'hours',
      label: 'Spielstunden',
      unit: 'h',
      group: 'Aktivität',
      icon: 'activity',
    });
  });

  it('falls back to keyword based grouping for unknown metrics', () => {
    const category = resolveStatsCategoryDef('minecraft:diamond_ore', {
      label: 'Diamanterz abgebaut',
      category: 'Items',
    });

    expect(category.group).toBe('Ressourcen');
  });
});
