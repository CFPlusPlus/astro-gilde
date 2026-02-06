import { tLabel } from '../minecraft-stats/i18n';
import type { PlayerTranslations } from '../minecraft-stats/types';
import { transformRawMinecraftValue } from '../minecraft-stats/metrics';
import { fmtNumber } from './format';

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
  const general = catalog.filter((entry) => entry.group === 'Allgemein');
  const base = general.length > 0 ? general : catalog;
  return base.slice(0, 4).map((entry) => entry.id);
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
      label: tLabel(key, 'stat', true, translations),
      group: 'Allgemein',
      unit: transformed.unit,
      decimals: transformed.decimals,
      kind: 'stat',
      key,
      transform,
    });
  }

  const itemSections = [
    { key: 'mined', label: 'Abgebaut' },
    { key: 'broken', label: 'Verbraucht' },
    { key: 'crafted', label: 'Hergestellt' },
    { key: 'used', label: 'Benutzt' },
    { key: 'picked_up', label: 'Aufgesammelt' },
    { key: 'dropped', label: 'Fallen gelassen' },
    { key: 'placed', label: 'Platziert' },
  ];

  for (const sec of itemSections) {
    const objA = asObj(statsA?.[`minecraft:${sec.key}`]);
    const objB = asObj(statsB?.[`minecraft:${sec.key}`]);
    const keys = new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]);
    const group = `Gegenstaende - ${sec.label}`;
    for (const key of [...keys].sort((a, b) => a.localeCompare(b, 'de'))) {
      list.push({
        id: `item:${sec.key}:${key}`,
        label: `${tLabel(key, 'item', true, translations)} (${sec.label})`,
        group,
        kind: 'item',
        key,
        section: `minecraft:${sec.key}`,
      });
    }
  }

  const mobSections = [
    { key: 'killed', label: 'Getoetet' },
    { key: 'killed_by', label: 'Gestorben durch' },
  ];

  for (const sec of mobSections) {
    const objA = asObj(statsA?.[`minecraft:${sec.key}`]);
    const objB = asObj(statsB?.[`minecraft:${sec.key}`]);
    const keys = new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]);
    const group = `Kreaturen - ${sec.label}`;
    for (const key of [...keys].sort((a, b) => a.localeCompare(b, 'de'))) {
      list.push({
        id: `mob:${sec.key}:${key}`,
        label: `${tLabel(key, 'mob', true, translations)} (${sec.label})`,
        group,
        kind: 'mob',
        key,
        section: `minecraft:${sec.key}`,
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
