import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Crown, Filter, ListOrdered, Search, Sparkles, Swords, X } from 'lucide-react';

import { getLeaderboard, getMetrics, getSummary, searchPlayers } from './api';
import type { LeaderboardRow, MetricDef, MetricId, PlayersSearchItem } from './types';
import { fmtDateBerlin, formatMetricValue, fmtNumber, rankMedal } from './format';

type TabKey = 'uebersicht' | 'king' | 'ranglisten' | 'versus';

const KPI_METRICS: MetricId[] = ['hours', 'distance', 'mob_kills', 'creeper'];

type LeaderboardState = {
  loaded: boolean;
  loading: boolean;
  pages: LeaderboardRow[][];
  currentPage: number;
  nextCursor: string | null;
  hasMore: boolean;
};

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

function ApiAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
      role="alert"
    >
      <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" aria-hidden="true" />
      <span className="text-fg/90">{message}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-surface border-border text-muted inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md">
      {children}
    </span>
  );
}

/**
 * Statistik-Island (React)
 * - Keine DOM-Manipulationen
 * - Lazy Loading für Ranglisten / König
 * - Typed API Layer (TS)
 */
export default function StatsApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('uebersicht');

  const [generatedIso, setGeneratedIso] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const [metrics, setMetrics] = useState<Record<string, MetricDef> | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  // Controls
  const [pageSize, setPageSize] = useState<number>(10);
  const [metricFilter, setMetricFilter] = useState<string>('');

  // Welcome / Info Callouts
  const [showWelcome, setShowWelcome] = useState(true);
  const [showKingInfo, setShowKingInfo] = useState(true);

  // Autocomplete
  const [searchValue, setSearchValue] = useState('');
  const [acItems, setAcItems] = useState<PlayersSearchItem[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acSelected, setAcSelected] = useState(-1);
  const acAbortRef = useRef<AbortController | null>(null);
  const acWrapRef = useRef<HTMLDivElement | null>(null);

  // Player name cache (uuid -> name) aus API payloads
  const playerNamesRef = useRef<Record<string, string>>({});

  // King + Metric states
  const [king, setKing] = useState<LeaderboardState>(makeEmptyLeaderboardState);
  const [boards, setBoards] = useState<Record<string, LeaderboardState>>({});

  // Hash -> Tab (nice UX, ohne JS-URL-Hacks)
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
      setShowKingInfo(localStorage.getItem('mg_stats_kinginfo_closed') !== '1');
    } catch {
      // ignore
    }
  }, []);

  // Initial load: KPI + player count
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const data = await getSummary(KPI_METRICS, ac.signal);
        if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
        if (typeof data.player_count === 'number') setPlayerCount(data.player_count);
        if (data.totals && typeof data.totals === 'object')
          setTotals(data.totals as Record<string, number>);
        setApiError(null);
      } catch (e) {
        console.warn('Summary Fehler', e);
        setApiError('Statistiken sind aktuell nicht erreichbar. Bitte versuche es später erneut.');
      }
    })();

    return () => ac.abort();
  }, []);

  // Tab-based prefetch
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Wenn PageSize geändert wird: Board-Caches verwerfen (Cursor hängt am Limit)
  useEffect(() => {
    setKing(makeEmptyLeaderboardState());
    setBoards({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // Click outside closes autocomplete
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = acWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setAcOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    const q = searchValue.trim();
    if (q.length < 2) {
      setAcItems([]);
      setAcOpen(false);
      setAcSelected(-1);
      return;
    }

    const t = window.setTimeout(async () => {
      acAbortRef.current?.abort();
      const ac = new AbortController();
      acAbortRef.current = ac;

      try {
        const data = await searchPlayers(q, 6, ac.signal);
        if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
        setAcItems(Array.isArray(data.items) ? data.items : []);
        setAcOpen(Array.isArray(data.items) && data.items.length > 0);
        setAcSelected(-1);
        setApiError(null);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        console.warn('Autocomplete Fehler', e);
        setApiError('Statistiken sind aktuell nicht erreichbar. Bitte versuche es später erneut.');
      }
    }, 180);

    return () => window.clearTimeout(t);
  }, [searchValue]);

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
    // stateKey erlaubt separate Caches (king vs. echte metricIds)
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

  const kpiDefs = useMemo(() => {
    const defs: Record<string, MetricDef> = {
      hours: { label: 'Spielzeit', category: 'Übersicht', unit: 'h', decimals: 2 },
      distance: { label: 'Distanz', category: 'Übersicht', unit: 'km', decimals: 2 },
      mob_kills: { label: 'Kills', category: 'Übersicht' },
      creeper: { label: 'Creeper', category: 'Übersicht' },
    };
    // Wenn API echte Defs liefert, nehmen wir diese – aber ohne harte Abhängigkeit.
    return defs;
  }, []);

  const filteredMetricIds = useMemo(() => {
    if (!metrics) return [];
    const q = metricFilter.trim().toLowerCase();
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
  }, [metrics, metricFilter]);

  const groupedMetrics = useMemo(() => {
    if (!metrics) return [];
    const map = new Map<string, string[]>();

    for (const id of filteredMetricIds) {
      const cat = metrics[id]?.category || 'Sonstiges';
      const arr = map.get(cat) || [];
      arr.push(id);
      map.set(cat, arr);
    }

    // Sortierung: category alphabetisch, metrics innerhalb nach label
    const cats = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'de'));
    return cats.map(([cat, ids]) => ({
      cat,
      ids: ids.sort((a, b) => (metrics[a]?.label || a).localeCompare(metrics[b]?.label || b, 'de')),
    }));
  }, [filteredMetricIds, metrics]);

  const hasNoResults = metrics && filteredMetricIds.length === 0;

  function TabButton({ tab, icon, label }: { tab: TabKey; icon: React.ReactNode; label: string }) {
    const isActive = activeTab === tab;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => {
          setActiveTab(tab);
          // Hash setzen (kleiner QoL), ohne Router
          try {
            window.history.replaceState({}, '', `#${tab}`);
          } catch {
            // ignore
          }
        }}
        className={[
          'text-muted hover:border-border/60 hover:text-fg focus-visible:ring-offset-bg -mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
          isActive ? 'active text-fg border-accent' : '',
        ].join(' ')}
      >
        {icon}
        {label}
      </button>
    );
  }

  function Pagination({
    state,
    onGo,
    onLoadMore,
  }: {
    state: LeaderboardState;
    onGo: (page: number) => void;
    onLoadMore: () => void;
  }) {
    if (!state.loaded) return null;

    return (
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {state.pages.map((_, i) => {
            const isActive = i === state.currentPage;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onGo(i)}
                className={[
                  'bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors',
                  isActive ? 'border-accent bg-accent/10' : '',
                ].join(' ')}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {state.hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors"
              disabled={state.loading}
            >
              <ChevronDown size={14} />
              Mehr laden
            </button>
          ) : (
            <span className="text-muted text-xs">Ende erreicht</span>
          )}
        </div>
      </div>
    );
  }

  function LeaderboardTable({
    metricId,
    def,
    stateKey,
  }: {
    metricId: string;
    def?: MetricDef;
    stateKey: string;
  }) {
    const st = stateKey === 'king' ? king : boards[stateKey] || makeEmptyLeaderboardState();
    const page = st.pages[st.currentPage] || [];

    return (
      <div className="border-border bg-surface relative overflow-x-auto rounded-[var(--radius)] border shadow-sm backdrop-blur-md">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-surface-solid/40 text-muted text-xs">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Platz</th>
              <th className="px-4 py-3 text-left font-semibold">Spielername</th>
              <th className="px-4 py-3 text-left font-semibold">
                {def?.unit ? `Wert (${def.unit})` : 'Wert'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3">
            {st.loaded && page.length === 0 ? (
              <tr>
                <td className="text-muted px-4 py-5 text-sm" colSpan={3}>
                  Keine Daten verfügbar.
                </td>
              </tr>
            ) : null}

            {page.map((row, i) => {
              const rank = st.currentPage * pageSize + (i + 1);
              const medal = rankMedal(rank);
              const name = getPlayerName(row.uuid);
              return (
                <tr key={`${row.uuid}-${i}`}>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      {medal ? <span aria-hidden="true">{medal}</span> : null}
                      <span className="font-semibold">{rank}</span>
                    </span>
                  </td>
                  <td className="min-w-0">
                    <button
                      type="button"
                      onClick={() => goToPlayer(row.uuid)}
                      className="hover:text-fg text-fg/90 inline-flex min-w-0 items-center gap-2 text-left transition-colors"
                      title="Zur Spielerstatistik"
                    >
                      <img
                        src={`https://minotar.net/helm/${encodeURIComponent(name)}/32.png`}
                        alt=""
                        className="h-8 w-8 flex-none rounded-lg bg-black/20"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="truncate">{name}</span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap">{formatMetricValue(row.value, def)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {st.loading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-md">
            <span className="bg-surface border-border text-fg inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm">
              Lädt…
            </span>
          </div>
        ) : null}

        <div className="border-border flex items-center justify-between gap-3 border-t px-4 py-3">
          <Pagination
            state={st}
            onGo={(pageIndex) => {
              if (stateKey === 'king') setKing((s) => ({ ...s, currentPage: pageIndex }));
              else
                setBoards((all) => ({
                  ...all,
                  [stateKey]: {
                    ...(all[stateKey] || makeEmptyLeaderboardState()),
                    currentPage: pageIndex,
                  },
                }));
            }}
            onLoadMore={() => void loadLeaderboard(metricId, stateKey)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/*
        Hinweis:
        Wir kapseln die Breitenbegrenzung im Island, damit die Seite nur noch <StatsApp /> mounten muss.
        So vermeiden wir doppelte `mg-container`-Wrapper und halten das Layout konsistent.
      */}
      <div className="mg-container mt-6">
        <div className="glass overflow-visible rounded-[var(--radius)] shadow-sm">
          {/* Tabs */}
          <div
            aria-label="Statistik Tabs"
            role="tablist"
            className="border-border flex flex-wrap items-center gap-1 border-b px-4"
          >
            <TabButton tab="uebersicht" icon={<Sparkles size={16} />} label="Übersicht" />
            <TabButton tab="king" icon={<Crown size={16} />} label="Server-König" />
            <TabButton tab="ranglisten" icon={<ListOrdered size={16} />} label="Ranglisten" />
            <TabButton tab="versus" icon={<Swords size={16} />} label="Versus" />
          </div>

          {/* Controls */}
          <div className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              {/* Suche */}
              <div className="relative w-full lg:max-w-xl" ref={acWrapRef}>
                <div className="bg-surface-solid/30 border-border flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
                  <Search size={18} className="text-muted" />
                  <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onFocus={() => setAcOpen(acItems.length > 0)}
                    onKeyDown={(e) => {
                      if (!acOpen) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setAcSelected((v) => Math.min((acItems?.length || 0) - 1, v + 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setAcSelected((v) => Math.max(-1, v - 1));
                      } else if (e.key === 'Enter') {
                        const it = acItems[acSelected] || acItems[0];
                        if (it?.uuid) goToPlayer(it.uuid);
                      } else if (e.key === 'Escape') {
                        setAcOpen(false);
                      }
                    }}
                    type="search"
                    autoComplete="off"
                    placeholder="Spieler suchen…"
                    className="placeholder:text-muted/70 text-fg w-full bg-transparent text-sm outline-none"
                  />
                </div>

                {/* Autocomplete */}
                {acOpen ? (
                  <div className="border-border bg-surface-solid/95 absolute right-0 left-0 z-50 mt-2 overflow-hidden rounded-[var(--radius)] border shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
                    <ul className="max-h-72 overflow-auto py-1">
                      {acItems.map((it, idx) => {
                        const isActive = idx === acSelected;
                        return (
                          <li key={`${it.uuid}-${idx}`}>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                goToPlayer(it.uuid);
                              }}
                              onMouseEnter={() => setAcSelected(idx)}
                              className={[
                                'text-fg/90 flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                                isActive ? 'bg-surface-solid/70' : 'hover:bg-surface-solid/60',
                              ].join(' ')}
                            >
                              <img
                                src={`https://minotar.net/helm/${encodeURIComponent(it.name)}/32.png`}
                                alt=""
                                className="h-8 w-8 flex-none rounded-lg bg-black/20"
                                loading="lazy"
                                decoding="async"
                              />
                              <span className="min-w-0 truncate">{it.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>

              {/* Meta + Controls */}
              <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                {typeof playerCount === 'number' ? (
                  <Chip>{fmtNumber(playerCount)} Spieler</Chip>
                ) : null}
                {generatedIso ? <Chip>Stand: {fmtDateBerlin(generatedIso)}</Chip> : null}

                {activeTab === 'king' || activeTab === 'ranglisten' ? (
                  <label className="bg-surface border-border text-fg inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md">
                    <span className="text-muted">Seite</span>
                    <select
                      value={pageSize}
                      onChange={(e) =>
                        setPageSize(Math.max(1, Math.min(100, Number(e.target.value) || 10)))
                      }
                      className="text-fg bg-transparent outline-none"
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

                {activeTab === 'ranglisten' ? (
                  <div className="bg-surface border-border inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md">
                    <Filter size={14} className="text-muted" />
                    <input
                      value={metricFilter}
                      onChange={(e) => setMetricFilter(e.target.value)}
                      placeholder="Ranglisten filtern…"
                      className="placeholder:text-muted/70 text-fg w-44 bg-transparent text-xs outline-none"
                      aria-label="Ranglisten filtern"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <ApiAlert message={apiError} />
          </div>
        </div>
      </div>

      {/* Panels */}
      {activeTab === 'uebersicht' ? (
        <section aria-label="Übersicht" className="mg-container pb-12">
          {showWelcome ? (
            <div className="mg-callout relative mt-6 flex items-start gap-3" data-variant="info">
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
                    // ignore
                  }
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Die Geschichte unserer Welt – in Zahlen
            </h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">
              Von langen Reisen über gefährliche Nächte bis zu großen Projekten: Hier siehst du den
              Puls des Servers.
            </p>
          </div>

          <div aria-live="polite" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KPI_METRICS.map((id) => {
              const def = kpiDefs[id];
              const value = totals?.[id];
              return (
                <div
                  key={id}
                  className="bg-surface border-border rounded-[var(--radius)] border p-4 shadow-sm backdrop-blur-md"
                >
                  <p className="text-muted text-xs font-semibold">{def.label}</p>
                  <p className="text-fg mt-2 text-2xl font-semibold tracking-tight">
                    {typeof value === 'number' ? formatMetricValue(value, def) : '–'}
                  </p>
                  <p className="text-muted mt-2 text-xs">
                    Kategorie: <span className="text-fg/80">{def.category}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'king' ? (
        <section aria-label="Server-König" className="mg-container pb-12">
          <div className="mt-6">
            <h2 className="text-xl font-semibold tracking-tight">Server-König</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">
              Wer sammelt die meisten Punkte über alle Kategorien hinweg?
            </p>

            {showKingInfo ? (
              <div className="mg-callout relative mt-6 flex items-start gap-3" data-variant="info">
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
                <button
                  type="button"
                  className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
                  aria-label="Schließen"
                  onClick={() => {
                    setShowKingInfo(false);
                    try {
                      localStorage.setItem('mg_stats_kinginfo_closed', '1');
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            ) : null}

            <div className="mt-5">
              <LeaderboardTable
                metricId="king"
                stateKey="king"
                def={{ label: 'Punkte', category: 'King' }}
              />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'ranglisten' ? (
        <section aria-label="Ranglisten" className="mg-container pb-12">
          <div className="mt-6">
            <h2 className="text-xl font-semibold tracking-tight">Ranglisten</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">
              Öffne eine Kategorie, um die Top-Werte zu sehen. Ranglisten werden erst geladen, wenn
              du sie wirklich brauchst (performant bei vielen Spielern).
            </p>

            {hasNoResults ? (
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

            <div className="mt-5 space-y-4">
              {!metrics ? (
                <div className="text-muted text-sm">Lade Ranglisten…</div>
              ) : (
                groupedMetrics.map(({ cat, ids }) => (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-fg/90 text-sm font-semibold">{cat}</p>
                      <span className="text-muted text-xs">{ids.length} Kategorien</span>
                    </div>

                    <div className="space-y-3">
                      {ids.map((metricId) => {
                        const def = metrics[metricId];
                        const st = boards[metricId] || makeEmptyLeaderboardState();
                        const isLoaded = st.loaded;

                        return (
                          <details
                            key={metricId}
                            className="bg-surface border-border rounded-[var(--radius)] border shadow-sm backdrop-blur-md"
                            onToggle={(e) => {
                              const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                              if (isOpen && !isLoaded && !st.loading) {
                                void loadLeaderboard(metricId, metricId);
                              }
                            }}
                          >
                            <summary className="cursor-pointer list-none px-4 py-3 select-none">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-fg leading-snug font-semibold">
                                    {def?.label || metricId}
                                  </p>
                                  <p className="text-muted mt-1 text-xs">
                                    ID: <span className="font-medium">{metricId}</span>
                                    {def?.unit ? (
                                      <>
                                        {' '}
                                        • Einheit: <span className="font-medium">{def.unit}</span>
                                      </>
                                    ) : null}
                                  </p>
                                </div>

                                <span className="bg-surface-solid/30 border-border text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                                  <ChevronDown size={14} />
                                  {isLoaded ? 'Anzeigen' : 'Laden'}
                                </span>
                              </div>
                            </summary>

                            <div className="px-4 pb-4">
                              <LeaderboardTable metricId={metricId} def={def} stateKey={metricId} />
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'versus' ? (
        <section aria-label="Versus" className="mg-container pb-12">
          <div className="mt-6">
            <div className="bg-surface border-border rounded-[var(--radius)] border p-5 shadow-sm backdrop-blur-md">
              <p className="text-fg font-semibold">Versus</p>
              <p className="text-muted mt-1 text-sm">
                Geplant, wird aber erst in einem späteren Schritt umgesetzt.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
