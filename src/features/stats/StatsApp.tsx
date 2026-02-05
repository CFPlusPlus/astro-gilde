import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Sparkles, Swords, X } from 'lucide-react';

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

const KPI_METRICS: MetricId[] = ['hours', 'distance', 'mob_kills', 'creeper'];

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

  // Ranglisten-UI: ausgewählte Metric
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);

  // Hash -> Tab (nice UX, ohne Router)
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
  }, [activeTab]);

  // Wenn PageSize geändert wird: Board-Caches verwerfen (Cursor hängt am Limit)
  useEffect(() => {
    setKing(makeEmptyLeaderboardState());
    setBoards({});
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

  // KPI-Definitions (fallback, falls API keine liefert)
  const kpiDefs = useMemo(() => {
    const defs: Record<string, MetricDef> = {
      hours: { label: 'Spielzeit', category: 'Übersicht', unit: 'h', decimals: 2 },
      distance: { label: 'Distanz', category: 'Übersicht', unit: 'km', decimals: 2 },
      mob_kills: { label: 'Kills', category: 'Übersicht' },
      creeper: { label: 'Creeper', category: 'Übersicht' },
    };
    return defs;
  }, []);

  const kpiItems: KpiItem[] = useMemo(() => {
    return KPI_METRICS.map((id) => {
      const def = kpiDefs[id];
      const value = totals?.[id];
      return {
        id,
        label: def.label,
        value: typeof value === 'number' ? formatMetricValue(value, def) : '–',
        meta: (
          <>
            Kategorie: <span className="text-fg/80">{def.category}</span>
          </>
        ),
      };
    });
  }, [kpiDefs, totals]);

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

  const groupedMetrics: GroupedMetrics = useMemo(() => {
    if (!metrics) return [];
    const map = new Map<string, string[]>();

    for (const id of filteredMetricIds) {
      const cat = metrics[id]?.category || 'Sonstiges';
      const arr = map.get(cat) || [];
      arr.push(id);
      map.set(cat, arr);
    }

    const cats = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'de'));
    return cats.map(([cat, ids]) => ({
      cat,
      ids: ids.sort((a, b) => (metrics[a]?.label || a).localeCompare(metrics[b]?.label || b, 'de')),
    }));
  }, [filteredMetricIds, metrics]);

  const hasNoResults = metrics && filteredMetricIds.length === 0;

  // Wenn Metrics geladen sind: sinnvollen Default auswählen
  useEffect(() => {
    if (!metrics) return;
    if (activeMetricId && filteredMetricIds.includes(activeMetricId)) return;

    const first = filteredMetricIds[0] || null;
    setActiveMetricId(first);
  }, [metrics, metricFilter]);

  // Wenn Metric ausgewählt wird: lazy load
  useEffect(() => {
    if (activeTab !== 'ranglisten') return;
    if (!activeMetricId) return;
    const st = boards[activeMetricId] || makeEmptyLeaderboardState();
    if (!st.loaded && !st.loading) {
      void loadLeaderboard(activeMetricId, activeMetricId);
    }
  }, [activeMetricId, activeTab]);

  function setTab(tab: TabKey) {
    setActiveTab(tab);
    try {
      window.history.replaceState({}, '', `#${tab}`);
    } catch {
      // ignore
    }
  }

  const showPageSize = activeTab === 'king' || activeTab === 'ranglisten';

  return (
    <div>
      {/*
        Neue Top-Struktur:
        - Pill-Navigation wie im neuen Layout (ähnlich HomeAnchorNav)
        - Search + Meta als offene Zeile (kein "riesiger Glass-Wrapper")
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
              value={searchValue}
              onChange={setSearchValue}
              items={acItems}
              open={acOpen}
              onOpenChange={setAcOpen}
              selectedIndex={acSelected}
              onSelectedIndexChange={setAcSelected}
              onChoose={(uuid) => goToPlayer(uuid)}
              wrapRef={acWrapRef}
            />

            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {typeof playerCount === 'number' ? (
                <Chip>{fmtNumber(playerCount)} Spieler</Chip>
              ) : null}
              {generatedIso ? <Chip>Stand: {fmtDateBerlin(generatedIso)}</Chip> : null}

              {showPageSize ? (
                <label className="bg-surface border-border text-fg inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur-md">
                  <span className="text-muted">Einträge</span>
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
                    // ignore
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
                {showKingInfo ? (
                  <div className="mg-callout relative flex items-start gap-3" data-variant="info">
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
              </div>

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
        </section>
      ) : null}

      {activeTab === 'ranglisten' ? (
        <section aria-label="Ranglisten" className="mg-container pb-12">
          <div className="mt-6">
            <SectionTitle
              title="Ranglisten"
              subtitle="Wähle links eine Kategorie aus. Ranglisten werden erst geladen, wenn du sie wirklich öffnest (performant bei vielen Spielern)."
            />

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
                  onSelectMetric={(id) => setActiveMetricId(id)}
                />
              )}

              <div className="space-y-3">
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
          <div className="mt-6">
            <div className="mg-card p-5">
              <div className="flex items-start gap-3">
                <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Swords size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-fg font-semibold">Versus</p>
                  <p className="text-muted mt-1 text-sm leading-relaxed">
                    Geplant, wird aber erst in einem späteren Schritt umgesetzt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
