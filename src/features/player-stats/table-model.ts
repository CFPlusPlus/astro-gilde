import { transformRawMinecraftValue } from '../minecraft-stats/metrics';
import { tLabel } from '../minecraft-stats/i18n';
import type { PlayerTranslations } from '../minecraft-stats/types';
import { matchQueries, nf, nf2, type ParsedQuery } from './format';

export type TabKey = 'allgemein' | 'items' | 'mobs';
export type SortDir = 'none' | 'asc' | 'desc';

export type GeneralRow = {
  raw: string;
  label: string;
  value: number;
  display: string;
};

export type ItemsRow = {
  key: string;
  label: string;
  mined: number;
  broken: number;
  crafted: number;
  used: number;
  picked_up: number;
  dropped: number;
};

export type MobsRow = {
  key: string;
  label: string;
  killed: number;
  killed_by: number;
};

export type SortState<K extends string> = { key: K; dir: SortDir };

export type PlayerTables = { general: GeneralRow[]; items: ItemsRow[]; mobs: MobsRow[] };

export function isTabKey(value: string | null): value is TabKey {
  return value === 'allgemein' || value === 'items' || value === 'mobs';
}

export function nextSort(dir: SortDir): SortDir {
  if (dir === 'none') return 'asc';
  if (dir === 'asc') return 'desc';
  return 'none';
}

export function buildPlayerTables(
  stats: Record<string, unknown> | null,
  isGerman: boolean,
  translations: PlayerTranslations | null,
): PlayerTables {
  const s = stats;
  if (!s) return { general: [], items: [], mobs: [] };

  const asObj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, number>) : null);

  const custom = asObj((s as Record<string, unknown>)['minecraft:custom']) || {};
  const general: GeneralRow[] = Object.entries(custom)
    .filter(([, v]) => typeof v === 'number')
    .map(([raw, value]) => {
      const label = tLabel(raw, 'stat', isGerman, translations);
      const rawNumber = value as number;
      const transformed = transformRawMinecraftValue(raw, rawNumber);

      let display = nf(rawNumber);
      if (transformed.unit === 'h') {
        display = `${nf2(transformed.value)} h`;
      } else if (transformed.unit === 'km') {
        display = `${nf2(transformed.value)} km`;
      }

      return { raw, label, value: rawNumber, display };
    });

  const mined = asObj((s as Record<string, unknown>)['minecraft:mined']) || {};
  const broken = asObj((s as Record<string, unknown>)['minecraft:broken']) || {};
  const crafted = asObj((s as Record<string, unknown>)['minecraft:crafted']) || {};
  const used = asObj((s as Record<string, unknown>)['minecraft:used']) || {};
  const picked = asObj((s as Record<string, unknown>)['minecraft:picked_up']) || {};
  const dropped = asObj((s as Record<string, unknown>)['minecraft:dropped']) || {};

  const itemKeys = new Set([
    ...Object.keys(mined),
    ...Object.keys(broken),
    ...Object.keys(crafted),
    ...Object.keys(used),
    ...Object.keys(picked),
    ...Object.keys(dropped),
  ]);

  const items: ItemsRow[] = [...itemKeys].map((k) => {
    const label = tLabel(k, 'item', isGerman, translations);
    return {
      key: k,
      label,
      mined: mined[k] || 0,
      broken: broken[k] || 0,
      crafted: crafted[k] || 0,
      used: used[k] || 0,
      picked_up: picked[k] || 0,
      dropped: dropped[k] || 0,
    };
  });

  const killed = asObj((s as Record<string, unknown>)['minecraft:killed']) || {};
  const killedBy = asObj((s as Record<string, unknown>)['minecraft:killed_by']) || {};
  const mobKeys = new Set([...Object.keys(killed), ...Object.keys(killedBy)]);
  const mobs: MobsRow[] = [...mobKeys].map((k) => {
    const label = tLabel(k, 'mob', isGerman, translations);
    return {
      key: k,
      label,
      killed: killed[k] || 0,
      killed_by: killedBy[k] || 0,
    };
  });

  return { general, items, mobs };
}

export function sortPlayerTables(
  tables: PlayerTables,
  sortGeneral: SortState<'label' | 'value' | 'raw'>,
  sortItems: SortState<keyof ItemsRow>,
  sortMobs: SortState<keyof MobsRow>,
): PlayerTables {
  const sortGeneralRows = (rows: GeneralRow[]) => {
    const { key, dir } = sortGeneral;
    const base = [...rows];
    const factor = dir === 'desc' ? -1 : 1;
    if (dir === 'none') return base.sort((a, b) => a.label.localeCompare(b.label, 'de'));
    return base.sort((a, b) => {
      if (key === 'value') return (a.value - b.value) * factor;
      const av = String(a[key]);
      const bv = String(b[key]);
      return av.localeCompare(bv, 'de') * factor;
    });
  };

  const sortItemsRows = (rows: ItemsRow[]) => {
    const { key, dir } = sortItems;
    const base = [...rows];
    const factor = dir === 'desc' ? -1 : 1;
    if (dir === 'none') return base.sort((a, b) => a.label.localeCompare(b.label, 'de'));

    return base.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), 'de') * factor;
    });
  };

  const sortMobsRows = (rows: MobsRow[]) => {
    const { key, dir } = sortMobs;
    const base = [...rows];
    const factor = dir === 'desc' ? -1 : 1;
    if (dir === 'none') return base.sort((a, b) => a.label.localeCompare(b.label, 'de'));

    return base.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), 'de') * factor;
    });
  };

  return {
    general: sortGeneralRows(tables.general),
    items: sortItemsRows(tables.items),
    mobs: sortMobsRows(tables.mobs),
  };
}

export function filterPlayerTables(
  tables: PlayerTables,
  parsedQueries: ParsedQuery[],
): PlayerTables {
  const general = tables.general.filter((r) =>
    matchQueries(parsedQueries, r.label, `${r.label} ${r.display} ${r.raw}`),
  );

  const items = tables.items.filter((r) =>
    matchQueries(
      parsedQueries,
      r.label,
      `${r.label} ${r.mined} ${r.broken} ${r.crafted} ${r.used} ${r.picked_up} ${r.dropped}`,
    ),
  );

  const mobs = tables.mobs.filter((r) =>
    matchQueries(parsedQueries, r.label, `${r.label} ${r.killed} ${r.killed_by}`),
  );

  return { general, items, mobs };
}
