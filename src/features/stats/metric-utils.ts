import type { MetricDef } from './types';

export type GroupedMetricIds = Array<{ cat: string; ids: string[] }>;

export function isServerKingMetric(id: string, def?: MetricDef) {
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
  const q = filter.trim().toLowerCase();
  const ids = Object.keys(metrics).filter((id) => !isServerKingMetric(id, metrics[id]));
  if (!q) return ids;
  return ids.filter((id) => {
    const def = metrics[id];
    return (
      id.toLowerCase().includes(q) ||
      (def?.label || '').toLowerCase().includes(q) ||
      (def?.category || '').toLowerCase().includes(q)
    );
  });
}

export function groupMetricIds(
  metrics: Record<string, MetricDef> | null,
  ids: string[],
): GroupedMetricIds {
  if (!metrics) return [];
  const map = new Map<string, string[]>();

  for (const id of ids) {
    const cat = metrics[id]?.category || 'Sonstiges';
    const arr = map.get(cat) || [];
    arr.push(id);
    map.set(cat, arr);
  }

  const cats = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'de'));
  return cats.map(([cat, entries]) => ({
    cat,
    ids: entries.sort((a, b) =>
      (metrics[a]?.label || a).localeCompare(metrics[b]?.label || b, 'de'),
    ),
  }));
}
