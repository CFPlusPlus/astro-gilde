import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Clock,
  Crown,
  Filter,
  Map as MapIcon,
  Skull,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';

import { getLeaderboard, getMetrics, getSummary, searchPlayers } from './api';
import type { MetricDef, MetricId, PlayersSearchItem } from './types';
import { fmtDateBerlin, formatMetricValue, fmtNumber } from './format';
import type { LeaderboardState, TabKey } from './types-ui';
import { ApiAlert, Chip, SectionTitle } from './components/StatsPrimitives';
import { StatsNavPills } from './components/StatsNavPills';
import { PlayerAutocomplete } from './components/PlayerAutocomplete';
import { KpiStrip, type KpiItem } from './components/KpiStrip';
import { MetricPicker, type GroupedMetrics } from './components/MetricPicker';
import { LeaderboardTable } from './components/LeaderboardTable';
import { getPlayer, getTranslations } from '../player-stats/api';
import type { PlayerTranslations } from '../player-stats/types';
import { tLabel } from '../player-stats/i18n';

const KPI_METRICS: MetricId[] = ['hours', 'distance', 'mob_kills', 'creeper'];
const VERSUS_MAX_METRICS = 12;

type VersusMetricKind = 'stat' | 'item' | 'mob';
type VersusMetricDef = {
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

type VersusGroupedMetrics = Array<{ cat: string; items: VersusMetricDef[] }>;

function filterMetricIds(metrics: Record<string, MetricDef> | null, filter: string) {
  if (!metrics) return [];
  const q = filter.trim().toLowerCase();
  const ids = Object.keys(metrics);
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

function groupMetricIds(metrics: Record<string, MetricDef> | null, ids: string[]): GroupedMetrics {
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

function filterVersusCatalog(catalog: VersusMetricDef[], filter: string) {
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

function groupVersusCatalog(catalog: VersusMetricDef[]): VersusGroupedMetrics {
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

function getQuickVersusSelection(catalog: VersusMetricDef[]) {
  const general = catalog.filter((entry) => entry.group === 'Allgemein');
  const base = general.length > 0 ? general : catalog;
  return base.slice(0, 4).map((entry) => entry.id);
}

function formatVersusValue(value: number, def?: VersusMetricDef) {
  const unit = def?.unit || '';
  const dec = def?.decimals ?? 0;
  return unit ? `${fmtNumber(value, dec)} ${unit}` : fmtNumber(value, dec);
}

function formatVersusDiff(value: number, def?: VersusMetricDef) {
  if (value === 0) return formatVersusValue(0, def);
  const sign = value > 0 ? '+' : '-';
  return `${sign}${formatVersusValue(Math.abs(value), def)}`;
}

function buildVersusCatalog(
  statsA: Record<string, unknown> | null,
  statsB: Record<string, unknown> | null,
  translations: PlayerTranslations | null,
): VersusMetricDef[] {
  const asObj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, number>) : null);

  const list: VersusMetricDef[] = [];
  const HOUR_KEYS = new Set([
    'minecraft:play_time',
    'minecraft:sneak_time',
    'minecraft:time_since_death',
    'minecraft:time_since_rest',
    'minecraft:total_world_time',
  ]);

  const customA = asObj(statsA?.['minecraft:custom']);
  const customB = asObj(statsB?.['minecraft:custom']);
  const customKeys = new Set([...Object.keys(customA || {}), ...Object.keys(customB || {})]);

  for (const key of [...customKeys].sort((a, b) => a.localeCompare(b, 'de'))) {
    let unit: string | undefined;
    let decimals: number | undefined;
    let transform: ((raw: number) => number) | undefined;

    if (HOUR_KEYS.has(key)) {
      unit = 'h';
      decimals = 2;
      transform = (raw) => raw / 72000;
    } else if (key.endsWith('_one_cm')) {
      unit = 'km';
      decimals = 2;
      transform = (raw) => raw / 100000;
    }

    list.push({
      id: `stat:${key}`,
      label: tLabel(key, 'stat', true, translations),
      group: 'Allgemein',
      unit,
      decimals,
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
    const group = `Gegenstände - ${sec.label}`;
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
    { key: 'killed', label: 'Getötet' },
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

function getVersusValue(stats: Record<string, unknown> | null, def?: VersusMetricDef) {
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

function usePlayerAutocomplete({
  onGeneratedIso,
  onError,
}: {
  onGeneratedIso?: (iso: string) => void;
  onError?: (message: string | null) => void;
}) {
  const [value, setValueState] = useState('');
  const [items, setItems] = useState<PlayersSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const suppressOpenForQueryRef = useRef<string | null>(null);

  function setValue(next: string) {
    suppressOpenForQueryRef.current = null;
    setValueState(next);
  }

  function setValueWithoutAutoOpen(next: string) {
    suppressOpenForQueryRef.current = next.trim().toLowerCase();
    setValueState(next);
    setOpen(false);
    setSelectedIndex(-1);
  }

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      suppressOpenForQueryRef.current = null;
      setItems([]);
      setOpen(false);
      setSelectedIndex(-1);
      return;
    }

    const t = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const data = await searchPlayers(q, 6, ac.signal);
        if (typeof data.__generated === 'string') onGeneratedIso?.(data.__generated);
        const nextItems = Array.isArray(data.items) ? data.items : [];
        const suppressOpen = suppressOpenForQueryRef.current === q.toLowerCase();
        setItems(nextItems);
        setOpen(!suppressOpen && nextItems.length > 0);
        if (suppressOpen) suppressOpenForQueryRef.current = null;
        setSelectedIndex(-1);
        onError?.(null);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        console.warn('Autocomplete Fehler', e);
        onError?.('Statistiken sind aktuell nicht erreichbar. Bitte versuche es später erneut.');
      }
    }, 180);

    return () => window.clearTimeout(t);
  }, [value, onGeneratedIso, onError]);

  return {
    value,
    setValue,
    setValueWithoutAutoOpen,
    items,
    setItems,
    open,
    setOpen,
    selectedIndex,
    setSelectedIndex,
    wrapRef,
  };
}

function makeEmptyLeaderboardState(): LeaderboardState {
  return {
    loaded: false,
    loading: false,
    pages: [],
    currentPage: 0,
    nextCursor: null,
    hasMore: false,
  };
}

/**
 * Statistik-Island (React)
 * - keine DOM-Manipulationen
 * - Lazy Loading für Ranglisten / König
 * - Layout orientiert sich an bestehenden Tokens/Patterns (mg-container, mg-card, mg-callout, glass)
 */
export default function StatsApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('uebersicht');

  const [generatedIso, setGeneratedIso] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const [metrics, setMetrics] = useState<Record<string, MetricDef> | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  // Steuerung
  const [pageSize, setPageSize] = useState<number>(10);
  const [metricFilter, setMetricFilter] = useState<string>('');

  // Welcome-/Info-Callouts
  const [showWelcome, setShowWelcome] = useState(true);

  // Versus
  const [versusMetricFilter, setVersusMetricFilter] = useState<string>('');
  const [versusMetricIds, setVersusMetricIds] = useState<string[]>([]);
  const [versusPlayerA, setVersusPlayerA] = useState<PlayersSearchItem | null>(null);
  const [versusPlayerB, setVersusPlayerB] = useState<PlayersSearchItem | null>(null);
  const [versusStatsA, setVersusStatsA] = useState<Record<string, unknown> | null>(null);
  const [versusStatsB, setVersusStatsB] = useState<Record<string, unknown> | null>(null);
  const [versusCatalog, setVersusCatalog] = useState<VersusMetricDef[]>([]);
  const [versusLoading, setVersusLoading] = useState(false);
  const [versusError, setVersusError] = useState<string | null>(null);
  const [versusNotice, setVersusNotice] = useState<string | null>(null);
  const [versusSwapFx, setVersusSwapFx] = useState(false);
  const versusAbortRef = useRef<AbortController | null>(null);
  const versusSwapFxTimeoutRef = useRef<number | null>(null);
  const metricScrollRef = useRef<number | null>(null);

  // Autovervollstaendigung
  const mainSearch = usePlayerAutocomplete({
    onGeneratedIso: setGeneratedIso,
    onError: setApiError,
  });
  const versusSearchA = usePlayerAutocomplete({
    onGeneratedIso: setGeneratedIso,
    onError: setVersusError,
  });
  const versusSearchB = usePlayerAutocomplete({
    onGeneratedIso: setGeneratedIso,
    onError: setVersusError,
  });

  // Spielername-Cache (uuid -> name) aus API-Payloads
  const playerNamesRef = useRef<Record<string, string>>({});

  // King- und Metrik-States
  const [king, setKing] = useState<LeaderboardState>(makeEmptyLeaderboardState);
  const [boards, setBoards] = useState<Record<string, LeaderboardState>>({});

  // Ranglisten-UI: ausgewaehlte Metrik
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);

  // Hash -> Tab (gute UX, ohne Router)
  useEffect(() => {
    const h = String(window.location.hash || '')
      .replace('#', '')
      .trim();
    if (h === 'king' || h === 'ranglisten' || h === 'versus' || h === 'uebersicht') {
      setActiveTab(h);
    }
  }, []);

  useEffect(() => {
    // Persistente Callout-States (damit es nicht bei jedem Reload wieder aufgeht)
    try {
      setShowWelcome(localStorage.getItem('mg_stats_welcome_closed') !== '1');
    } catch {
      // Unkritisch: localStorage kann blockiert sein.
    }
  }, []);

  useEffect(() => {
    return () => {
      if (versusSwapFxTimeoutRef.current !== null) {
        window.clearTimeout(versusSwapFxTimeoutRef.current);
      }
    };
  }, []);

  // Initialer Load: KPI + Spieleranzahl
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const data = await getSummary(KPI_METRICS, ac.signal);
        if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
        if (typeof data.player_count === 'number') setPlayerCount(data.player_count);
        if (data.totals && typeof data.totals === 'object') {
          setTotals(data.totals as Record<string, number>);
        }
        setApiError(null);
      } catch (e) {
        console.warn('Summary Fehler', e);
        setApiError('Statistiken sind aktuell nicht erreichbar. Bitte versuche es später erneut.');
      }
    })();

    return () => ac.abort();
  }, []);

  // Tab-basiertes Prefetch
  useEffect(() => {
    if (activeTab === 'ranglisten' && !metrics) {
      const ac = new AbortController();
      (async () => {
        try {
          const data = await getMetrics(ac.signal);
          if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
          setMetrics((data.metrics || {}) as Record<string, MetricDef>);
          setApiError(null);
        } catch (e) {
          console.warn('Metrics Fehler', e);
          setApiError(
            'Statistiken sind aktuell nicht erreichbar. Bitte versuche es später erneut.',
          );
        }
      })();
      return () => ac.abort();
    }

    if (activeTab === 'king' && !king.loaded && !king.loading) {
      void loadLeaderboard('king', 'king');
    }
  }, [activeTab]);

  // Wenn PageSize geändert wird: Board-Caches verwerfen (Cursor hängt am Limit)
  useEffect(() => {
    setKing(makeEmptyLeaderboardState());
    setBoards({});
  }, [pageSize]);

  function getPlayerName(uuid: string) {
    return playerNamesRef.current[uuid] || uuid;
  }

  function mergePlayers(players?: Record<string, string>) {
    if (!players) return;
    for (const [uuid, name] of Object.entries(players)) {
      if (!playerNamesRef.current[uuid] && typeof name === 'string') {
        playerNamesRef.current[uuid] = name;
      }
    }
  }

  async function loadLeaderboard(metricId: string, stateKey: string) {
    // stateKey erlaubt separate Caches (king vs. echte Metrik-IDs)
    setApiError(null);

    const setState = (up: (s: LeaderboardState) => LeaderboardState) => {
      if (stateKey === 'king') setKing((s) => up(s));
      else
        setBoards((all) => {
          const prev = all[stateKey] || makeEmptyLeaderboardState();
          return { ...all, [stateKey]: up(prev) };
        });
    };

    const current = stateKey === 'king' ? king : boards[stateKey] || makeEmptyLeaderboardState();
    if (current.loading) return;

    setState((s) => ({ ...s, loading: true }));

    try {
      const cursor = current.loaded ? current.nextCursor : null;
      const data = await getLeaderboard(metricId, pageSize, cursor);
      if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
      mergePlayers(data.__players);

      const list = data.boards && data.boards[metricId] ? data.boards[metricId] : [];
      const next = data.cursors && data.cursors[metricId] ? data.cursors[metricId] : null;

      setState((s) => {
        const pages = cursor ? [...s.pages, list] : [list];
        return {
          loaded: true,
          loading: false,
          pages,
          currentPage: cursor ? s.currentPage : 0,
          nextCursor: next,
          hasMore: !!next,
        };
      });
    } catch (e) {
      console.warn('Leaderboard Fehler', e);
      setApiError('Statistiken sind aktuell nicht erreichbar. Bitte versuche es später erneut.');
      setState((s) => ({ ...s, loading: false }));
    }
  }

  function goToPlayer(uuid: string) {
    window.location.href = `/statistiken/spieler/?uuid=${encodeURIComponent(uuid)}`;
  }

  function setVersusPlayer(
    side: 'A' | 'B',
    uuid: string,
    items: PlayersSearchItem[],
    search: ReturnType<typeof usePlayerAutocomplete>,
  ) {
    const found = items.find((it) => it.uuid === uuid);
    const next = found || { uuid, name: uuid };
    if (side === 'A') setVersusPlayerA(next);
    else setVersusPlayerB(next);
    search.setValueWithoutAutoOpen(next.name);
    playerNamesRef.current[next.uuid] = next.name;
  }

  function clearVersusPlayer(side: 'A' | 'B') {
    if (side === 'A') setVersusPlayerA(null);
    else setVersusPlayerB(null);
    const search = side === 'A' ? versusSearchA : versusSearchB;
    search.setValue('');
    search.setItems([]);
    search.setOpen(false);
    search.setSelectedIndex(-1);
  }

  function triggerVersusSwapFx() {
    setVersusSwapFx(false);
    if (versusSwapFxTimeoutRef.current !== null) {
      window.clearTimeout(versusSwapFxTimeoutRef.current);
    }
    window.requestAnimationFrame(() => setVersusSwapFx(true));
    versusSwapFxTimeoutRef.current = window.setTimeout(() => setVersusSwapFx(false), 420);
  }

  function swapVersusPlayers() {
    const nextA = versusPlayerB;
    const nextB = versusPlayerA;
    setVersusPlayerA(nextA);
    setVersusPlayerB(nextB);
    versusSearchA.setValueWithoutAutoOpen(nextA?.name || '');
    versusSearchB.setValueWithoutAutoOpen(nextB?.name || '');
    triggerVersusSwapFx();
  }

  function updateVersusSearch(side: 'A' | 'B', next: string) {
    const search = side === 'A' ? versusSearchA : versusSearchB;
    const current = side === 'A' ? versusPlayerA : versusPlayerB;
    search.setValue(next);
    if (current && current.name.trim().toLowerCase() !== next.trim().toLowerCase()) {
      if (side === 'A') setVersusPlayerA(null);
      else setVersusPlayerB(null);
    }
  }

  async function runVersusCompare() {
    const playerA = versusPlayerA;
    const playerB = versusPlayerB;

    if (!playerA || !playerB) {
      setVersusError('Bitte wähle zwei Spieler für den Vergleich aus.');
      return;
    }

    if (playerA.uuid === playerB.uuid) {
      setVersusError('Bitte wähle zwei unterschiedliche Spieler.');
      return;
    }

    setVersusError(null);
    setVersusNotice(null);
    setVersusLoading(true);
    versusAbortRef.current?.abort();
    const ac = new AbortController();
    versusAbortRef.current = ac;

    try {
      const [t, a, b] = await Promise.all([
        getTranslations(ac.signal).catch(() => null),
        getPlayer(playerA.uuid, ac.signal),
        getPlayer(playerB.uuid, ac.signal),
      ]);

      const statsA =
        a.found === false || !a.player || typeof a.player !== 'object'
          ? null
          : (a.player as Record<string, unknown>);
      const statsB =
        b.found === false || !b.player || typeof b.player !== 'object'
          ? null
          : (b.player as Record<string, unknown>);

      if (!statsA) {
        setVersusError(`Spieler A (${playerA.name}) wurde nicht gefunden.`);
        setVersusStatsA(null);
        setVersusStatsB(null);
        setVersusCatalog([]);
        return;
      }

      if (!statsB) {
        setVersusError(`Spieler B (${playerB.name}) wurde nicht gefunden.`);
        setVersusStatsA(null);
        setVersusStatsB(null);
        setVersusCatalog([]);
        return;
      }

      if (typeof a.__generated === 'string') setGeneratedIso(a.__generated);
      if (typeof b.__generated === 'string') setGeneratedIso(b.__generated);

      setVersusStatsA(statsA);
      setVersusStatsB(statsB);

      const catalog = buildVersusCatalog(statsA, statsB, t);
      setVersusCatalog(catalog);

      setVersusMetricIds((prev) => {
        const available = new Set(catalog.map((entry) => entry.id));
        const filtered = prev.filter((id) => available.has(id));
        if (filtered.length > 0) return filtered.slice(0, VERSUS_MAX_METRICS);

        const quick = getQuickVersusSelection(catalog);
        return quick.slice(0, VERSUS_MAX_METRICS);
      });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      console.warn('Versus Fehler', e);
      setVersusError('Versus konnte nicht geladen werden. Bitte versuche es später erneut.');
    } finally {
      setVersusLoading(false);
    }
  }

  function applyVersusSelection(next: string[]) {
    const unique = Array.from(new Set(next));
    if (unique.length > VERSUS_MAX_METRICS) {
      setVersusNotice(`Maximal ${VERSUS_MAX_METRICS} Kategorien gleichzeitig.`);
      setVersusMetricIds(unique.slice(0, VERSUS_MAX_METRICS));
      return;
    }
    setVersusNotice(null);
    setVersusMetricIds(unique);
  }

  function toggleVersusMetric(id: string) {
    setVersusMetricIds((prev) => {
      if (prev.includes(id)) {
        setVersusNotice(null);
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= VERSUS_MAX_METRICS) {
        setVersusNotice(`Maximal ${VERSUS_MAX_METRICS} Kategorien gleichzeitig.`);
        return prev;
      }
      setVersusNotice(null);
      return [...prev, id];
    });
  }

  // KPI-Definitionen (Fallback, falls API keine liefert)
  const kpiDefs = useMemo(() => {
    const defs: Record<string, MetricDef> = {
      hours: { label: 'Spielzeit', category: 'Übersicht', unit: 'h', decimals: 2 },
      distance: { label: 'Distanz', category: 'Übersicht', unit: 'km', decimals: 2 },
      mob_kills: { label: 'Kills', category: 'Übersicht' },
      creeper: { label: 'Creeper', category: 'Übersicht' },
    };
    return defs;
  }, []);

  const kpiIcons = useMemo(() => {
    return {
      hours: <Clock size={16} />,
      distance: <MapIcon size={16} />,
      mob_kills: <Swords size={16} />,
      creeper: <Skull size={16} />,
    } as Record<string, React.ReactNode>;
  }, []);

  const kpiItems: KpiItem[] = useMemo(() => {
    return KPI_METRICS.map((id) => {
      const def = kpiDefs[id];
      const value = totals?.[id];
      return {
        id,
        icon: kpiIcons[id],
        label: def.label,
        value: typeof value === 'number' ? formatMetricValue(value, def) : '–',
      };
    });
  }, [kpiDefs, kpiIcons, totals]);

  const filteredMetricIds = useMemo(
    () => filterMetricIds(metrics, metricFilter),
    [metrics, metricFilter],
  );

  const groupedMetrics: GroupedMetrics = useMemo(
    () => groupMetricIds(metrics, filteredMetricIds),
    [metrics, filteredMetricIds],
  );

  const versusFilteredCatalog = useMemo(
    () => filterVersusCatalog(versusCatalog, versusMetricFilter),
    [versusCatalog, versusMetricFilter],
  );

  const versusGroupedMetrics: VersusGroupedMetrics = useMemo(
    () => groupVersusCatalog(versusFilteredCatalog),
    [versusFilteredCatalog],
  );

  const hasNoRanklistResults = metrics && filteredMetricIds.length === 0;
  const hasNoVersusResults = versusCatalog.length > 0 && versusFilteredCatalog.length === 0;

  // Beim Öffnen der Ranglisten direkt die erste Rangliste aktivieren.
  useEffect(() => {
    if (activeTab !== 'ranglisten') return;
    if (!metrics) return;
    if (activeMetricId) return;
    const first = filteredMetricIds[0] || null;
    setActiveMetricId(first);
  }, [activeTab, metrics, filteredMetricIds, activeMetricId]);

  // Wenn Metriken geladen sind: sinnvollen Standard auswaehlen
  useEffect(() => {
    if (!metrics) return;
    if (activeMetricId && filteredMetricIds.includes(activeMetricId)) return;

    const first = filteredMetricIds[0] || null;
    setActiveMetricId(first);
  }, [metrics, metricFilter]);

  // Wenn Metrik ausgewaehlt wird: Lazy-Load
  useEffect(() => {
    if (activeTab !== 'ranglisten') return;
    if (!activeMetricId) return;
    const st = boards[activeMetricId] || makeEmptyLeaderboardState();
    if (!st.loaded && !st.loading) {
      void loadLeaderboard(activeMetricId, activeMetricId);
    }
  }, [activeMetricId, activeTab]);

  // Scroll-Position beim Kategorie-Wechsel stabil halten
  useEffect(() => {
    if (activeTab !== 'ranglisten') return;
    const y = metricScrollRef.current;
    if (y === null) return;
    metricScrollRef.current = null;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: y });
    });
  }, [activeMetricId, activeTab]);

  useEffect(() => {
    setVersusStatsA(null);
    setVersusStatsB(null);
    setVersusCatalog([]);
    setVersusNotice(null);
    setVersusError(null);
  }, [versusPlayerA?.uuid, versusPlayerB?.uuid]);

  useEffect(() => {
    if (versusCatalog.length === 0) return;
    setVersusMetricIds((prev) => {
      const available = new Set(versusCatalog.map((entry) => entry.id));
      const filtered = prev.filter((id) => available.has(id));
      if (filtered.length > 0) return filtered.slice(0, VERSUS_MAX_METRICS);
      const quick = getQuickVersusSelection(versusCatalog);
      return quick.slice(0, VERSUS_MAX_METRICS);
    });
  }, [versusCatalog]);

  function setTab(tab: TabKey) {
    setActiveTab(tab);
    try {
      window.history.replaceState({}, '', `#${tab}`);
    } catch {
      // Unkritisch: History-API kann blockiert sein.
    }
  }

  const showPageSize = activeTab === 'king' || activeTab === 'ranglisten';

  const isSameVersusPlayer =
    !!versusPlayerA && !!versusPlayerB && versusPlayerA.uuid === versusPlayerB.uuid;

  const canRunVersus = !!versusPlayerA && !!versusPlayerB && !versusLoading && !isSameVersusPlayer;
  const versusSwapFxClass = versusSwapFx
    ? 'border-accent/55 bg-accent/10 ring-accent/35 ring-1'
    : '';
  const versusCardAZClass = versusSearchA.open ? 'z-50' : 'z-30';
  const versusCardBZClass = versusSearchB.open ? 'z-50' : 'z-30';

  const hasVersusData = !!versusStatsA && !!versusStatsB;

  const versusCatalogMap = useMemo(
    () => new Map(versusCatalog.map((entry) => [entry.id, entry])),
    [versusCatalog],
  );

  const versusRows = useMemo(() => {
    return versusMetricIds
      .map((id) => {
        const def = versusCatalogMap.get(id);
        if (!def) return null;
        return {
          id,
          def,
          valueA: getVersusValue(versusStatsA, def),
          valueB: getVersusValue(versusStatsB, def),
        };
      })
      .filter(
        (
          row,
        ): row is {
          id: string;
          def: VersusMetricDef;
          valueA: number | null;
          valueB: number | null;
        } => row !== null,
      );
  }, [versusMetricIds, versusCatalogMap, versusStatsA, versusStatsB]);

  const versusSummary = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    let counted = 0;

    for (const row of versusRows) {
      if (row.valueA === null || row.valueB === null) continue;
      counted += 1;
      if (row.valueA > row.valueB) winsA += 1;
      else if (row.valueB > row.valueA) winsB += 1;
      else ties += 1;
    }

    return { winsA, winsB, ties, counted };
  }, [versusRows]);

  const hasVersusResults = hasVersusData && versusRows.length > 0;
  const hasMissingVersusValues = versusRows.some(
    (row) => row.valueA === null || row.valueB === null,
  );

  return (
    <div>
      {/*
        Neue Top-Struktur:
        - Pill-Navigation wie im neuen Layout (aehnlich HomeAnchorNav)
        - Suche + Meta als offene Zeile (kein "riesiger Glass-Wrapper")
      */}
      <section className="mg-container pb-8">
        <div className="mt-2 space-y-4">
          <StatsNavPills
            active={activeTab}
            onChange={(tab) => {
              setTab(tab);
            }}
          />

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <PlayerAutocomplete
              value={mainSearch.value}
              onChange={mainSearch.setValue}
              items={mainSearch.items}
              open={mainSearch.open}
              onOpenChange={mainSearch.setOpen}
              selectedIndex={mainSearch.selectedIndex}
              onSelectedIndexChange={mainSearch.setSelectedIndex}
              onChoose={(uuid) => goToPlayer(uuid)}
              wrapRef={mainSearch.wrapRef}
            />

            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {typeof playerCount === 'number' ? (
                <Chip>{fmtNumber(playerCount)} Spieler</Chip>
              ) : null}
              {generatedIso ? <Chip>Stand: {fmtDateBerlin(generatedIso)}</Chip> : null}

              {showPageSize ? (
                <label className="bg-surface border-border text-fg inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-md">
                  <span className="text-muted">Einträge</span>
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      setPageSize(Math.max(1, Math.min(100, Number(e.target.value) || 10)))
                    }
                    className="text-fg bg-transparent text-xs leading-none font-semibold outline-none"
                    aria-label="Einträge pro Seite"
                  >
                    {[10, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          <ApiAlert message={apiError} />
        </div>
      </section>

      {activeTab === 'uebersicht' ? (
        <section aria-label="Übersicht" className="mg-container pb-12">
          {showWelcome ? (
            <div className="mg-callout relative flex items-start gap-3" data-variant="info">
              <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-fg font-semibold">Willkommen auf der Statistik-Seite!</p>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  Nutze die Suche oben, um direkt zur Spielerstatistik zu springen. In den
                  Ranglisten findest du die Top-Werte je Kategorie – von Spielzeit über Distanz bis
                  zu Kreaturen.
                </p>
              </div>
              <button
                type="button"
                className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
                aria-label="Schließen"
                onClick={() => {
                  setShowWelcome(false);
                  try {
                    localStorage.setItem('mg_stats_welcome_closed', '1');
                  } catch {
                    // Unkritisch: localStorage kann blockiert sein.
                  }
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : null}

          <div className="mt-8">
            <SectionTitle
              title="Die Geschichte unserer Welt – in Zahlen"
              subtitle="Von langen Reisen über gefährliche Nächte bis zu großen Projekten: Hier siehst du den Puls des Servers."
            />
          </div>

          <div aria-live="polite" className="mt-5">
            <KpiStrip items={kpiItems} />
          </div>
        </section>
      ) : null}

      {activeTab === 'king' ? (
        <section aria-label="Server-König" className="mg-container pb-12">
          <div className="mt-6">
            <SectionTitle
              title="Server-König"
              subtitle="Wer sammelt die meisten Punkte über alle Kategorien hinweg?"
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
              <div className="space-y-4">
                <div className="mg-callout flex items-start gap-3" data-variant="info">
                  <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
                    <Crown size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-fg font-semibold">Wie werden die Punkte berechnet?</p>
                    <p className="text-muted mt-1 text-sm leading-relaxed">
                      Für jede Kategorie bekommen die Top 3 Spieler Punkte (3 / 2 / 1). Ab Platz 4
                      gibt es keine Punkte. Die Punkte werden über alle Kategorien addiert.
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <LeaderboardTable
                  def={{ label: 'Punkte', category: 'King' }}
                  state={king}
                  pageSize={pageSize}
                  getPlayerName={getPlayerName}
                  onPlayerClick={goToPlayer}
                  onGoPage={(pageIndex) => setKing((s) => ({ ...s, currentPage: pageIndex }))}
                  onLoadMore={() => void loadLeaderboard('king', 'king')}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'ranglisten' ? (
        <section aria-label="Ranglisten" className="mg-container pb-12">
          <div className="mt-6">
            <SectionTitle
              title="Ranglisten"
              subtitle="Wähle links eine Kategorie aus. Ranglisten werden erst geladen, wenn du sie wirklich öffnest (performant bei vielen Spielern)."
            />

            {hasNoRanklistResults ? (
              <div
                className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
                role="status"
              >
                <div
                  className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full"
                  aria-hidden="true"
                />
                <span className="text-fg/90">Keine Ranglisten gefunden.</span>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
              {!metrics ? (
                <div className="mg-card text-muted p-5 text-sm">Lade Ranglisten…</div>
              ) : (
                <MetricPicker
                  metrics={metrics}
                  grouped={groupedMetrics}
                  filter={metricFilter}
                  onFilterChange={setMetricFilter}
                  activeMetricId={activeMetricId}
                  onSelectMetric={(id) => {
                    if (id === activeMetricId) return;
                    metricScrollRef.current = window.scrollY;
                    setActiveMetricId(id);
                  }}
                />
              )}

              <div className="min-w-0 space-y-3">
                {metrics && activeMetricId ? (
                  <div className="mg-card p-4">
                    <p className="text-muted text-xs font-semibold">Aktive Rangliste</p>
                    <p className="text-fg mt-1 text-lg font-semibold tracking-tight">
                      {metrics[activeMetricId]?.label || activeMetricId}
                    </p>
                    <p className="text-muted mt-2 text-sm">
                      Kategorie:{' '}
                      <span className="text-fg/80">{metrics[activeMetricId]?.category || '–'}</span>
                      <span className="text-muted"> • </span>
                      ID: <span className="text-fg/80">{activeMetricId}</span>
                      {metrics[activeMetricId]?.unit ? (
                        <>
                          <span className="text-muted"> • </span>
                          Einheit:{' '}
                          <span className="text-fg/80">{metrics[activeMetricId]?.unit}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                ) : (
                  <div className="mg-card p-6">
                    <p className="text-fg font-semibold">Keine Rangliste ausgewählt</p>
                    <p className="text-muted mt-2 text-sm">
                      Wähle links eine Kategorie aus, um die Top-Werte zu sehen.
                    </p>
                  </div>
                )}

                {metrics && activeMetricId ? (
                  <LeaderboardTable
                    def={metrics[activeMetricId]}
                    state={boards[activeMetricId] || makeEmptyLeaderboardState()}
                    pageSize={pageSize}
                    getPlayerName={getPlayerName}
                    onPlayerClick={goToPlayer}
                    onGoPage={(pageIndex) =>
                      setBoards((all) => ({
                        ...all,
                        [activeMetricId]: {
                          ...(all[activeMetricId] || makeEmptyLeaderboardState()),
                          currentPage: pageIndex,
                        },
                      }))
                    }
                    onLoadMore={() => void loadLeaderboard(activeMetricId, activeMetricId)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {activeTab === 'versus' ? (
        <section aria-label="Versus" className="mg-container pb-12">
          <div className="mt-6 space-y-6">
            <SectionTitle
              title="Versus"
              subtitle="Vergleiche zwei Spieler in ausgewählten Kategorien."
            />

            <div className="mg-card relative z-20 overflow-visible p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
                    <Swords size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-fg font-semibold">Spieler-Vergleich</p>
                    <p className="text-muted mt-1 text-sm leading-relaxed">
                      Wähle zwei Spieler und starte den Vergleich. Für beste Ergebnisse nutze
                      konkrete Kategorien.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={swapVersusPlayers}
                  disabled={!versusPlayerA && !versusPlayerB}
                  className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowLeftRight size={16} />
                  Tauschen
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                <div
                  className={[
                    'bg-surface border-border relative min-w-0 rounded-[var(--radius)] border p-3 shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300',
                    versusCardAZClass,
                    versusSwapFxClass,
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-muted text-xs font-semibold uppercase">Spieler A</p>
                    {versusPlayerA ? (
                      <button
                        type="button"
                        onClick={() => clearVersusPlayer('A')}
                        className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
                        aria-label="Spieler A entfernen"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <PlayerAutocomplete
                      value={versusSearchA.value}
                      onChange={(next) => updateVersusSearch('A', next)}
                      items={versusSearchA.items}
                      open={versusSearchA.open}
                      onOpenChange={(open) => {
                        versusSearchA.setOpen(open);
                        if (open) versusSearchB.setOpen(false);
                      }}
                      selectedIndex={versusSearchA.selectedIndex}
                      onSelectedIndexChange={versusSearchA.setSelectedIndex}
                      onChoose={(uuid) =>
                        setVersusPlayer('A', uuid, versusSearchA.items, versusSearchA)
                      }
                      wrapRef={versusSearchA.wrapRef}
                    />
                  </div>
                  {versusPlayerA ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <img
                          src={`https://minotar.net/helm/${encodeURIComponent(
                            versusPlayerA.name,
                          )}/32.png`}
                          alt=""
                          className="h-8 w-8 flex-none rounded-lg bg-black/20"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0">
                          <p className="text-fg truncate text-sm font-semibold">
                            {versusPlayerA.name}
                          </p>
                          <p className="text-muted truncate text-xs">{versusPlayerA.uuid}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToPlayer(versusPlayerA.uuid)}
                        className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex w-fit shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors"
                      >
                        Profil
                      </button>
                    </div>
                  ) : (
                    <p className="text-muted mt-2 text-xs">Wähle einen Spieler aus der Liste.</p>
                  )}
                </div>

                <div className="text-muted text-center text-xs font-semibold tracking-wide uppercase">
                  vs
                </div>

                <div
                  className={[
                    'bg-surface border-border relative min-w-0 rounded-[var(--radius)] border p-3 shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300',
                    versusCardBZClass,
                    versusSwapFxClass,
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-muted text-xs font-semibold uppercase">Spieler B</p>
                    {versusPlayerB ? (
                      <button
                        type="button"
                        onClick={() => clearVersusPlayer('B')}
                        className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
                        aria-label="Spieler B entfernen"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <PlayerAutocomplete
                      value={versusSearchB.value}
                      onChange={(next) => updateVersusSearch('B', next)}
                      items={versusSearchB.items}
                      open={versusSearchB.open}
                      onOpenChange={(open) => {
                        versusSearchB.setOpen(open);
                        if (open) versusSearchA.setOpen(false);
                      }}
                      selectedIndex={versusSearchB.selectedIndex}
                      onSelectedIndexChange={versusSearchB.setSelectedIndex}
                      onChoose={(uuid) =>
                        setVersusPlayer('B', uuid, versusSearchB.items, versusSearchB)
                      }
                      wrapRef={versusSearchB.wrapRef}
                    />
                  </div>
                  {versusPlayerB ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <img
                          src={`https://minotar.net/helm/${encodeURIComponent(
                            versusPlayerB.name,
                          )}/32.png`}
                          alt=""
                          className="h-8 w-8 flex-none rounded-lg bg-black/20"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0">
                          <p className="text-fg truncate text-sm font-semibold">
                            {versusPlayerB.name}
                          </p>
                          <p className="text-muted truncate text-xs">{versusPlayerB.uuid}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToPlayer(versusPlayerB.uuid)}
                        className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex w-fit shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors"
                      >
                        Profil
                      </button>
                    </div>
                  ) : (
                    <p className="text-muted mt-2 text-xs">Wähle einen Spieler aus der Liste.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-start gap-2 sm:items-center">
                <button
                  type="button"
                  onClick={() => void runVersusCompare()}
                  disabled={!canRunVersus}
                  className="bg-accent hover:bg-accent2 focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Swords size={16} />
                  Vergleichen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearVersusPlayer('A');
                    clearVersusPlayer('B');
                    setVersusError(null);
                    setVersusNotice(null);
                  }}
                  className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition-colors"
                >
                  Zurücksetzen
                </button>
                <span className="text-muted text-xs sm:ml-auto">
                  Maximal {VERSUS_MAX_METRICS} Kategorien gleichzeitig.
                </span>
              </div>

              {isSameVersusPlayer ? (
                <div
                  className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-xs"
                  role="status"
                >
                  <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
                  <span className="text-fg/90">Bitte wähle zwei unterschiedliche Spieler.</span>
                </div>
              ) : null}

              {versusNotice ? (
                <div
                  className="bg-surface border-border text-muted mt-3 rounded-[var(--radius)] border px-4 py-3 text-xs"
                  role="status"
                >
                  {versusNotice}
                </div>
              ) : null}

              {versusError ? <ApiAlert message={versusError} /> : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
              {!hasVersusData ? (
                <div className="mg-card min-w-0 text-muted p-5 text-sm">
                  Klicke auf "Vergleichen", um die Spielerstatistiken zu laden.
                </div>
              ) : (
                <div className="mg-card min-w-0 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
                    <span className="text-muted text-xs">{versusCatalog.length} Einträge</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyVersusSelection(getQuickVersusSelection(versusCatalog))}
                      className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                    >
                      Schnellwahl
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyVersusSelection(versusFilteredCatalog.map((entry) => entry.id))
                      }
                      className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                    >
                      Alle
                    </button>
                    <button
                      type="button"
                      onClick={() => applyVersusSelection([])}
                      className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                    >
                      Keine
                    </button>
                    <span className="text-muted text-xs">
                      {versusMetricIds.length}/{VERSUS_MAX_METRICS} ausgewählt
                    </span>
                  </div>

                  <div className="bg-surface-solid/30 border-border mt-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
                    <Filter size={16} className="text-muted" />
                    <input
                      value={versusMetricFilter}
                      onChange={(e) => setVersusMetricFilter(e.target.value)}
                      placeholder="Filtern..."
                      className="placeholder:text-muted/70 text-fg w-full bg-transparent text-sm outline-none"
                      aria-label="Versus Kategorien filtern"
                    />
                  </div>

                  {hasNoVersusResults ? (
                    <div
                      className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
                      role="status"
                    >
                      <div
                        className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full"
                        aria-hidden="true"
                      />
                      <span className="text-fg/90">Keine Kategorien gefunden.</span>
                    </div>
                  ) : null}

                  <div className="mt-4 max-h-[520px] overflow-auto pr-1">
                    <div className="space-y-5">
                      {versusGroupedMetrics.map(({ cat, items }) => (
                        <div key={cat} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-muted min-w-0 break-words text-xs font-semibold tracking-wide uppercase">
                              {cat}
                            </p>
                            <span className="text-muted text-xs">{items.length}</span>
                          </div>

                          <ul className="space-y-1" role="list">
                            {items.map((entry) => {
                              const isActive = versusMetricIds.includes(entry.id);
                              return (
                                <li key={entry.id}>
                                  <button
                                    type="button"
                                    onClick={() => toggleVersusMetric(entry.id)}
                                    className={[
                                      'border-border/60 hover:bg-surface-solid/45 text-fg/90 w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                                      isActive
                                        ? 'bg-surface-solid/55 border-accent/50'
                                        : 'bg-surface-solid/30',
                                    ].join(' ')}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <span className="min-w-0 break-words">{entry.label}</span>
                                      <span className="flex items-center gap-2">
                                        {entry.unit ? (
                                          <span className="text-muted mt-0.5 text-xs font-semibold whitespace-nowrap">
                                            {entry.unit}
                                          </span>
                                        ) : null}
                                        {isActive ? (
                                          <Check size={16} className="text-accent" />
                                        ) : null}
                                      </span>
                                    </div>
                                    <p className="text-muted mt-1 text-xs break-all">
                                      ID: {entry.id}
                                    </p>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="min-w-0 space-y-3">
                {versusLoading ? (
                  <div className="mg-card p-4">
                    <p className="text-fg font-semibold">Spielerstatistiken werden geladen...</p>
                    <p className="text-muted mt-1 text-sm">
                      Je mehr Daten vorhanden sind, desto länger dauert der Vergleich.
                    </p>
                  </div>
                ) : null}

                {!versusPlayerA || !versusPlayerB ? (
                  <div className="mg-card p-6">
                    <p className="text-fg font-semibold">Bitte zwei Spieler wählen</p>
                    <p className="text-muted mt-2 text-sm">
                      Nutze die Suche oben, um Spieler A und B auszuwählen.
                    </p>
                  </div>
                ) : !hasVersusData ? (
                  <div className="mg-card p-6">
                    <p className="text-fg font-semibold">Spielerstatistiken laden</p>
                    <p className="text-muted mt-2 text-sm">
                      Klicke auf "Vergleichen", um die kompletten Spielerstatistiken zu laden.
                    </p>
                  </div>
                ) : versusMetricIds.length === 0 ? (
                  <div className="mg-card p-6">
                    <p className="text-fg font-semibold">Keine Kategorien ausgewählt</p>
                    <p className="text-muted mt-2 text-sm">
                      Wähle links die Kategorien aus, die du vergleichen möchtest.
                    </p>
                  </div>
                ) : !hasVersusResults ? (
                  <div className="mg-card p-6">
                    <p className="text-fg font-semibold">Vergleich bereit</p>
                    <p className="text-muted mt-2 text-sm">
                      Wähle Kategorien aus, um die Werte zu sehen.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mg-card min-w-0 p-4">
                      <p className="text-muted text-xs font-semibold">Zwischenstand</p>
                      <div className="mt-2 flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">
                        <span className="bg-surface border-border text-fg inline-flex w-full max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                          <span className="min-w-0 truncate">{versusPlayerA?.name || 'Spieler A'}</span>
                          <span className="shrink-0">: {versusSummary.winsA}</span>
                        </span>
                        <span className="bg-surface border-border text-fg inline-flex w-full max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                          <span className="min-w-0 truncate">{versusPlayerB?.name || 'Spieler B'}</span>
                          <span className="shrink-0">: {versusSummary.winsB}</span>
                        </span>
                        <span className="bg-surface border-border text-muted inline-flex w-full items-center rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                          Gleichstand: {versusSummary.ties}
                        </span>
                        <span className="text-muted w-full text-xs sm:w-auto">
                          Verglichene Kategorien: {versusSummary.counted}
                        </span>
                      </div>
                      {hasMissingVersusValues ? (
                        <p className="text-muted mt-2 text-xs">
                          Hinweis: Einige Werte fehlen, wenn ein Spieler keinen Eintrag in der
                          Kategorie hat.
                        </p>
                      ) : null}
                    </div>

                    <div className="mg-card relative min-w-0 overflow-hidden">
                      <div className="max-w-full overflow-x-auto overscroll-x-contain">
                        <table className="w-full min-w-[560px] sm:min-w-[720px] text-sm">
                          <thead className="bg-surface-solid/40 text-muted text-xs">
                            <tr>
                              <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                                Kategorie
                              </th>
                              <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                                {versusPlayerA?.name || 'Spieler A'}
                              </th>
                              <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                                {versusPlayerB?.name || 'Spieler B'}
                              </th>
                              <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                                Differenz
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3">
                            {versusRows.map((row) => {
                              const def = row.def;
                              const label = def?.label || row.id;
                              const winner =
                                row.valueA === null || row.valueB === null
                                  ? null
                                  : row.valueA === row.valueB
                                    ? 'tie'
                                    : row.valueA > row.valueB
                                      ? 'A'
                                      : 'B';
                              const diff =
                                row.valueA === null || row.valueB === null
                                  ? null
                                  : row.valueA - row.valueB;
                              const missingHint = 'Keine Daten';

                              return (
                                <tr key={row.id}>
                                  <td>
                                    <p className="text-fg font-semibold">{label}</p>
                                    <p className="text-muted mt-1 text-xs break-all">
                                      Gruppe: {def?.group || '-'} - ID: {row.id}
                                      {def?.unit ? ` - Einheit: ${def.unit}` : ''}
                                    </p>
                                  </td>
                                  <td
                                    className={
                                      winner === 'A' ? 'text-accent font-semibold' : 'text-fg'
                                    }
                                  >
                                    {row.valueA === null ? '-' : formatVersusValue(row.valueA, def)}
                                    {row.valueA === null ? (
                                      <p className="text-muted mt-1 text-xs">{missingHint}</p>
                                    ) : null}
                                  </td>
                                  <td
                                    className={
                                      winner === 'B' ? 'text-accent font-semibold' : 'text-fg'
                                    }
                                  >
                                    {row.valueB === null ? '-' : formatVersusValue(row.valueB, def)}
                                    {row.valueB === null ? (
                                      <p className="text-muted mt-1 text-xs">{missingHint}</p>
                                    ) : null}
                                  </td>
                                  <td className="text-fg/90">
                                    {diff === null ? '-' : formatVersusDiff(diff, def)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-muted px-2.5 pb-2 text-[11px] sm:hidden">
                        Seitlich wischen, um alle Spalten zu sehen.
                      </p>

                      {versusLoading ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-md">
                          <span className="bg-surface border-border text-fg inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm">
                            Lädt...
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
