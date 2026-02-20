import { normalizeUmlauts } from './normalizeUmlauts';
import type { MetricDef } from './types';

export type StatsCategoryGroup = 'Aktivität' | 'Erkundung' | 'Kampf' | 'Ressourcen' | 'Sonstiges';

export type StatsCategoryIcon = 'activity' | 'explore' | 'combat' | 'resource' | 'misc';

export type StatsCategoryDef = {
  key: string;
  label: string;
  unit?: string;
  group: StatsCategoryGroup;
  icon?: StatsCategoryIcon;
};

type StatsCategoryOverride = Omit<StatsCategoryDef, 'key'>;

export const STATS_CATEGORY_GROUP_ORDER: readonly StatsCategoryGroup[] = [
  'Aktivität',
  'Erkundung',
  'Kampf',
  'Ressourcen',
  'Sonstiges',
];

const GROUP_INDEX = new Map<string, number>(
  STATS_CATEGORY_GROUP_ORDER.map((group, index) => [group, index]),
);

const STATS_CATEGORY_OVERRIDES: Record<string, StatsCategoryOverride> = {
  hours: { label: 'Spielzeit', unit: 'h', group: 'Aktivität', icon: 'activity' },
  play_time: { label: 'Spielzeit', group: 'Aktivität', icon: 'activity' },
  'minecraft:play_time': { label: 'Spielzeit', group: 'Aktivität', icon: 'activity' },
  distance: { label: 'Distanz', unit: 'km', group: 'Erkundung', icon: 'explore' },
  'minecraft:walk_one_cm': {
    label: 'Laufdistanz',
    unit: 'km',
    group: 'Erkundung',
    icon: 'explore',
  },
  'minecraft:fly_one_cm': { label: 'Flugdistanz', unit: 'km', group: 'Erkundung', icon: 'explore' },
  mob_kills: { label: 'Mob-Kills', group: 'Kampf', icon: 'combat' },
  player_kills: { label: 'Spieler-Kills', group: 'Kampf', icon: 'combat' },
  deaths: { label: 'Tode', group: 'Kampf', icon: 'combat' },
  creeper: { label: 'Creeper getötet', group: 'Kampf', icon: 'combat' },
};

const GROUP_MATCHERS: Array<{
  group: StatsCategoryGroup;
  keywords: string[];
}> = [
  {
    group: 'Aktivität',
    keywords: [
      'zeit',
      'time',
      'hours',
      'hour',
      'played',
      'online',
      'join',
      'login',
      'session',
      'activity',
    ],
  },
  {
    group: 'Erkundung',
    keywords: [
      'distance',
      'distanz',
      'travel',
      'walk',
      'swim',
      'boat',
      'minecart',
      'horse',
      'ride',
      'fly',
      'elytra',
      'biome',
      'nether',
      'end',
      'explor',
      'adventure',
    ],
  },
  {
    group: 'Kampf',
    keywords: [
      'kill',
      'killed',
      'death',
      'combat',
      'battle',
      'damage',
      'crit',
      'arrow',
      'bow',
      'sword',
      'mob',
      'pvp',
      'creeper',
      'skeleton',
      'zombie',
      'spider',
      'wither',
      'dragon',
      'totem',
    ],
  },
  {
    group: 'Ressourcen',
    keywords: [
      'mine',
      'mined',
      'break',
      'place',
      'block',
      'item',
      'craft',
      'crafted',
      'smelt',
      'harvest',
      'farm',
      'ore',
      'diamond',
      'iron',
      'gold',
      'emerald',
      'wood',
      'stone',
      'resource',
      'chest',
      'loot',
      'trade',
      'villager',
      'fish',
      'fishing',
      'bucket',
      'crop',
    ],
  },
];

function normalizeText(value: string): string {
  return normalizeUmlauts(value).toLowerCase().trim();
}

function joinSearchText(parts: Array<string | null | undefined>): string {
  return normalizeText(
    parts
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join(' '),
  );
}

function resolveCategoryGroupFromText(searchText: string): StatsCategoryGroup {
  for (const { group, keywords } of GROUP_MATCHERS) {
    if (keywords.some((keyword) => searchText.includes(keyword))) {
      return group;
    }
  }

  return 'Sonstiges';
}

export function resolveStatsCategoryDef(metricId: string, metricDef?: MetricDef): StatsCategoryDef {
  const safeId = metricId.trim();
  const normalizedId = safeId.toLowerCase();
  const override = STATS_CATEGORY_OVERRIDES[normalizedId];

  const label = normalizeUmlauts(metricDef?.label || override?.label || safeId);
  const unit = metricDef?.unit || override?.unit;

  const searchText = joinSearchText([
    safeId,
    label,
    metricDef?.category || null,
    metricDef?.unit || null,
  ]);

  const group = override?.group || resolveCategoryGroupFromText(searchText);

  return {
    key: safeId,
    label,
    unit,
    group,
    icon: override?.icon,
  };
}

export function getStatsCategoryGroupOrder(group: string): number {
  const index = GROUP_INDEX.get(group);
  return typeof index === 'number' ? index : STATS_CATEGORY_GROUP_ORDER.length;
}
