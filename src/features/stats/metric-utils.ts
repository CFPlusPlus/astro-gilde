import type { MetricDef } from './types';
import {
  getStatsCategoryGroupOrder,
  resolveStatsCategoryDef,
  type StatsCategoryDef,
} from './statsCategories';
import { normalizeUmlauts } from './normalizeUmlauts';

export type GroupedMetricIds = Array<{ cat: string; ids: string[] }>;

function normalizeForSearch(value: string) {
  return normalizeUmlauts(value).toLowerCase().trim();
}

function isServerKingMetric(id: string, def?: MetricDef) {
  const normalizedId = id.trim().toLowerCase();
  if (normalizedId === 'king' || normalizedId === 'server_king' || normalizedId === 'server-king') {
    return true;
  }

  const label = (def?.label || '').trim().toLowerCase();
  const category = (def?.category || '').trim().toLowerCase();
  if (category === 'king' || category === 'server-koenig') {
    return true;
  }

  return label.includes('server-koenig');
}

export function pickDefaultRankMetricId(ids: string[], metrics: Record<string, MetricDef> | null) {
  if (ids.length === 0) return null;

  const preferredIds = ['hours', 'play_time', 'minecraft:play_time'];
  for (const id of preferredIds) {
    if (ids.includes(id)) return id;
  }

  if (metrics) {
    const byLabel = ids.find((id) => {
      const label = (metrics[id]?.label || '').toLowerCase();
      return label.includes('spielstunden') || label.includes('spielzeit');
    });
    if (byLabel) return byLabel;
  }

  return ids[0];
}

export function filterMetricIds(metrics: Record<string, MetricDef> | null, filter: string) {
  if (!metrics) return [];
  const q = normalizeForSearch(filter);
  const ids = Object.keys(metrics).filter((id) => !isServerKingMetric(id, metrics[id]));
  if (!q) return ids;
  return ids.filter((id) => {
    const def = metrics[id];
    const categoryDef = resolveStatsCategoryDef(id, def);
    return (
      normalizeForSearch(id).includes(q) ||
      normalizeForSearch(def?.label || '').includes(q) ||
      normalizeForSearch(def?.category || '').includes(q) ||
      normalizeForSearch(categoryDef.label).includes(q) ||
      normalizeForSearch(categoryDef.group).includes(q)
    );
  });
}

export function groupMetricIds(
  metrics: Record<string, MetricDef> | null,
  ids: string[],
): GroupedMetricIds {
  if (!metrics) return [];
  const map = new Map<string, { ids: string[]; defs: Record<string, StatsCategoryDef> }>();

  for (const id of ids) {
    const categoryDef = resolveStatsCategoryDef(id, metrics[id]);
    const group = categoryDef.group;
    const existing = map.get(group);
    if (existing) {
      existing.ids.push(id);
      existing.defs[id] = categoryDef;
      continue;
    }

    map.set(group, {
      ids: [id],
      defs: { [id]: categoryDef },
    });
  }

  const cats = Array.from(map.entries()).sort((a, b) => {
    const byOrder = getStatsCategoryGroupOrder(a[0]) - getStatsCategoryGroupOrder(b[0]);
    if (byOrder !== 0) return byOrder;
    return a[0].localeCompare(b[0], 'de');
  });
  return cats.map(([cat, entry]) => ({
    cat,
    ids: entry.ids.sort((a, b) => entry.defs[a].label.localeCompare(entry.defs[b].label, 'de')),
  }));
}
