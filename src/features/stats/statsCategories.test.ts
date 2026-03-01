import { describe, expect, it } from 'vitest';

import { resolveStatsCategoryDef } from './statsCategories';

describe('statsCategories', () => {
  it('uses API category as group when provided', () => {
    const category = resolveStatsCategoryDef('hours', {
      label: 'Spielstunden',
      category: 'Allgemein',
      unit: 'h',
    });

    expect(category).toEqual({
      key: 'hours',
      label: 'Spielstunden',
      unit: 'h',
      group: 'Allgemein',
      icon: 'activity',
    });
  });

  it('falls back to keyword based grouping when API category is missing', () => {
    const category = resolveStatsCategoryDef('minecraft:diamond_ore', {
      label: 'Diamanterz abgebaut',
      category: '',
    });

    expect(category.group).toBe('Ressourcen');
  });
});
