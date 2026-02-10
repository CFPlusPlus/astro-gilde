export type ItemSectionKey =
  | 'mined'
  | 'broken'
  | 'crafted'
  | 'used'
  | 'picked_up'
  | 'dropped'
  | 'placed';

export type MobSectionKey = 'killed' | 'killed_by';

export type ItemSectionDef = {
  key: ItemSectionKey;
  label: string;
  statKey: `minecraft:${ItemSectionKey}`;
};

export type MobSectionDef = {
  key: MobSectionKey;
  label: string;
  statKey: `minecraft:${MobSectionKey}`;
};

// Zentrale Definition fuer Item-Sektionen.
export const ITEM_SECTION_DEFS: ReadonlyArray<ItemSectionDef> = [
  { key: 'mined', label: 'Abgebaut', statKey: 'minecraft:mined' },
  { key: 'broken', label: 'Verbraucht', statKey: 'minecraft:broken' },
  { key: 'crafted', label: 'Hergestellt', statKey: 'minecraft:crafted' },
  { key: 'used', label: 'Benutzt', statKey: 'minecraft:used' },
  { key: 'picked_up', label: 'Aufgesammelt', statKey: 'minecraft:picked_up' },
  { key: 'dropped', label: 'Fallen gelassen', statKey: 'minecraft:dropped' },
  { key: 'placed', label: 'Platziert', statKey: 'minecraft:placed' },
];

// Reihenfolge der Item-Spalten in /statistiken/spieler (bewusst ohne "placed").
export const PLAYER_TABLE_ITEM_SECTION_KEYS = [
  'mined',
  'broken',
  'crafted',
  'used',
  'picked_up',
  'dropped',
] as const;

// Zentrale Definition fuer Mob-Sektionen.
export const MOB_SECTION_DEFS: ReadonlyArray<MobSectionDef> = [
  { key: 'killed', label: 'Get\u00f6tet', statKey: 'minecraft:killed' },
  { key: 'killed_by', label: 'Gestorben durch', statKey: 'minecraft:killed_by' },
];
