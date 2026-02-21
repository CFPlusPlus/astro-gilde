import { tLabel } from '../stats-core/i18n';
import { transformRawMinecraftValue } from '../stats-core/metrics';
import { ITEM_SECTION_DEFS, MOB_SECTION_DEFS } from '../stats-core/minecraft-sections';
import type { PlayerTranslations } from '../stats-core/types';
import { fmtNumber } from './format';
import { normalizeUmlauts } from './normalizeUmlauts';

export type VersusMetricKind = 'stat' | 'item' | 'mob';

export type VersusMetricDef = {
  id: string;
  label: string;
  group: string;
  unit?: string;
  decimals?: number;
  kind: VersusMetricKind;
  key: string;
  section?: string;
  transform?: (raw: number) => number;
};

export type VersusGroupedMetrics = Array<{ cat: string; items: VersusMetricDef[] }>;

type VersusKpiPreset = {
  ids: string[];
  terms: string[];
};

const VERSUS_KPI_PRESETS: readonly VersusKpiPreset[] = [
  {
    ids: ['stat:minecraft:play_time', 'stat:play_time', 'stat:hours'],
    terms: ['spielzeit', 'spielstunden', 'play time', 'onlinezeit'],
  },
  {
    ids: ['stat:minecraft:walk_one_cm', 'stat:distance', 'stat:walk_one_cm'],
    terms: ['distanz', 'laufdistanz', 'distance', 'walk'],
  },
  {
    ids: [
      'stat:minecraft:mob_kills',
      'stat:mob_kills',
      'stat:minecraft:player_kills',
      'stat:player_kills',
    ],
    terms: ['mob-kills', 'kills', 'toetungen', 'getoetet'],
  },
  {
    ids: ['mob:killed:minecraft:creeper', 'stat:creeper', 'stat:minecraft:creeper_kills'],
    terms: ['creeper'],
  },
];

function normalizeForVersusSearch(value: string): string {
  return normalizeUmlauts(value).toLowerCase();
}

function pickVersusPresetMetric(
  catalog: VersusMetricDef[],
  byId: Map<string, VersusMetricDef>,
  preset: VersusKpiPreset,
  usedIds: Set<string>,
) {
  for (const id of preset.ids) {
    const entry = byId.get(id);
    if (entry && !usedIds.has(entry.id)) return entry;
  }

  return catalog.find((entry) => {
    if (usedIds.has(entry.id)) return false;
    const haystack = `${normalizeForVersusSearch(entry.id)} ${normalizeForVersusSearch(entry.label)}`;
    return preset.terms.some((term) => haystack.includes(normalizeForVersusSearch(term)));
  });
}

export function getVersusKpiSelection(catalog: VersusMetricDef[]) {
  const selected: string[] = [];
  const usedIds = new Set<string>();
  const byId = new Map(catalog.map((entry) => [entry.id, entry]));

  for (const preset of VERSUS_KPI_PRESETS) {
    const picked = pickVersusPresetMetric(catalog, byId, preset, usedIds);
    if (!picked) continue;
    selected.push(picked.id);
    usedIds.add(picked.id);
  }

  const general = catalog.filter((entry) => entry.group === 'Allgemein');
  const fallbackBase = general.length > 0 ? general : catalog;

  for (const entry of fallbackBase) {
    if (selected.length >= 4) break;
    if (usedIds.has(entry.id)) continue;
    selected.push(entry.id);
    usedIds.add(entry.id);
  }

  return selected.slice(0, 4);
}

export function filterVersusCatalog(catalog: VersusMetricDef[], filter: string) {
  const q = filter.trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter((entry) => {
    return (
      entry.id.toLowerCase().includes(q) ||
      entry.label.toLowerCase().includes(q) ||
      entry.group.toLowerCase().includes(q)
    );
  });
}

export function groupVersusCatalog(catalog: VersusMetricDef[]): VersusGroupedMetrics {
  const map = new Map<string, VersusMetricDef[]>();
  for (const entry of catalog) {
    const arr = map.get(entry.group) || [];
    arr.push(entry);
    map.set(entry.group, arr);
  }

  const cats = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'de'));
  return cats.map(([cat, items]) => ({
    cat,
    items: items.sort((a, b) => a.label.localeCompare(b.label, 'de')),
  }));
}

export function getQuickVersusSelection(catalog: VersusMetricDef[]) {
  return getVersusKpiSelection(catalog);
}

export function formatVersusValue(value: number, def?: VersusMetricDef) {
  const unit = def?.unit || '';
  const dec = def?.decimals ?? 0;
  return unit ? `${fmtNumber(value, dec)} ${unit}` : fmtNumber(value, dec);
}

export function formatVersusDiff(value: number, def?: VersusMetricDef) {
  if (value === 0) return formatVersusValue(0, def);
  const sign = value > 0 ? '+' : '-';
  return `${sign}${formatVersusValue(Math.abs(value), def)}`;
}

export function buildVersusCatalog(
  statsA: Record<string, unknown> | null,
  statsB: Record<string, unknown> | null,
  translations: PlayerTranslations | null,
): VersusMetricDef[] {
  const asObj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, number>) : null);
  const list: VersusMetricDef[] = [];

  const customA = asObj(statsA?.['minecraft:custom']);
  const customB = asObj(statsB?.['minecraft:custom']);
  const customKeys = new Set([...Object.keys(customA || {}), ...Object.keys(customB || {})]);

  for (const key of [...customKeys].sort((a, b) => a.localeCompare(b, 'de'))) {
    const transformed = transformRawMinecraftValue(key, 1);
    const transform =
      transformed.value === 1
        ? undefined
        : (raw: number) => transformRawMinecraftValue(key, raw).value;

    list.push({
      id: `stat:${key}`,
      label: normalizeUmlauts(tLabel(key, 'stat', true, translations)),
      group: 'Allgemein',
      unit: transformed.unit,
      decimals: transformed.decimals,
      kind: 'stat',
      key,
      transform,
    });
  }

  for (const sec of ITEM_SECTION_DEFS) {
    const objA = asObj(statsA?.[sec.statKey]);
    const objB = asObj(statsB?.[sec.statKey]);
    const keys = new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]);
    const group = normalizeUmlauts(`Gegenst\u00e4nde - ${sec.label}`);
    for (const key of [...keys].sort((a, b) => a.localeCompare(b, 'de'))) {
      list.push({
        id: `item:${sec.key}:${key}`,
        label: normalizeUmlauts(`${tLabel(key, 'item', true, translations)} (${sec.label})`),
        group,
        kind: 'item',
        key,
        section: sec.statKey,
      });
    }
  }

  for (const sec of MOB_SECTION_DEFS) {
    const objA = asObj(statsA?.[sec.statKey]);
    const objB = asObj(statsB?.[sec.statKey]);
    const keys = new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]);
    const group = normalizeUmlauts(`Kreaturen - ${sec.label}`);
    for (const key of [...keys].sort((a, b) => a.localeCompare(b, 'de'))) {
      list.push({
        id: `mob:${sec.key}:${key}`,
        label: normalizeUmlauts(`${tLabel(key, 'mob', true, translations)} (${sec.label})`),
        group,
        kind: 'mob',
        key,
        section: sec.statKey,
      });
    }
  }

  return list;
}

export function getVersusValue(stats: Record<string, unknown> | null, def?: VersusMetricDef) {
  if (!stats || !def) return null;
  const asObj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, number>) : null);

  if (def.kind === 'stat') {
    const custom = asObj(stats['minecraft:custom']);
    const raw = custom?.[def.key];
    if (typeof raw !== 'number') return null;
    return def.transform ? def.transform(raw) : raw;
  }

  const sectionKey = def.section || '';
  const sec = asObj(stats[sectionKey]);
  const raw = sec?.[def.key];
  if (typeof raw !== 'number') return null;
  return def.transform ? def.transform(raw) : raw;
}
