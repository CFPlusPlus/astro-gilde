import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getLeaderboard, getMetrics, getSummary } from '../api';
import { KPI_METRICS } from '../constants';
import { filterMetricIds, groupMetricIds, pickDefaultRankMetricId } from '../metric-utils';
import { normalizeUmlauts } from '../normalizeUmlauts';
import type { MetricDef, SummaryResponse } from '../types';
import type { LeaderboardState, TabKey } from '../types-ui';
import { usePlayerAutocomplete } from '../usePlayerAutocomplete';
import type { GroupedMetrics } from '../components/MetricPicker';
import { getLiveResource } from '../../../lib/live/cache';
import {
  LIVE_WIDGET_THRESHOLDS,
  type LiveDataErrorKind,
  type LiveDataState,
} from '../../../lib/live/types';
import { resolveLastUpdatedTimestamp } from '../../../lib/live/lastUpdated';

const API_ERROR_MESSAGE =
  'Statistiken sind aktuell nicht erreichbar. Bitte versuche es sp\u00e4ter erneut.';
const API_RATE_LIMIT_MESSAGE =
  'Zu viele Anfragen an die Statistik-API. Bitte versuche es spaeter erneut.';

function resolveHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;

  const withStatus = error as { status?: unknown; message?: unknown };
  if (typeof withStatus.status === 'number' && Number.isFinite(withStatus.status)) {
    return withStatus.status;
  }

  if (typeof withStatus.message === 'string') {
    const match = withStatus.message.match(/\bHTTP\s+(\d{3})\b/i);
    if (match) {
      const status = Number(match[1]);
      return Number.isFinite(status) ? status : null;
    }
  }

  return null;
}

function resolveLeaderboardErrorKind(error: unknown): LiveDataErrorKind {
  const status = resolveHttpStatus(error);
  if (status === 429) return 'rate_limit';
  if (typeof status === 'number' && status >= 400 && status < 500) return 'invalid';
  if (typeof status === 'number' && status >= 500) return 'network';
  if ((error as Error | undefined)?.name === 'AbortError') return 'timeout';
  return 'unknown';
}
const SUMMARY_CACHE_KEY = 'stats-kpi-summary';

function makeEmptyLeaderboardState(): LeaderboardState {
  return {
    loaded: false,
    loading: false,
    liveStatus: 'ok',
    liveErrorKind: null,
    pages: [],
    currentPage: 0,
    nextCursor: null,
    hasMore: false,
    pageSize: null,
  };
}

export function useStatsData({
  activeTab,
  pageSize,
  metricFilter,
  initialActiveMetricId,
}: {
  activeTab: TabKey;
  pageSize: number;
  metricFilter: string;
  initialActiveMetricId?: string | null;
}) {
  const [generatedIso, setGeneratedIso] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<Record<string, MetricDef> | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLastUpdatedAt, setSummaryLastUpdatedAt] = useState<number | null>(null);
  const [summaryReloadTrigger, setSummaryReloadTrigger] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const [king, setKing] = useState<LeaderboardState>(makeEmptyLeaderboardState);
  const [boards, setBoards] = useState<Record<string, LeaderboardState>>({});
  const [activeMetricId, setActiveMetricId] = useState<string | null>(
    initialActiveMetricId || null,
  );

  const playerNamesRef = useRef<Record<string, string>>({});
  const kingRef = useRef(king);
  const boardsRef = useRef(boards);
  const pageSizeRef = useRef(pageSize);

  useEffect(() => {
    kingRef.current = king;
  }, [king]);

  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  const mainSearch = usePlayerAutocomplete({
    onGeneratedIso: setGeneratedIso,
    onError: setApiError,
  });

  const mergePlayers = useCallback((players?: Record<string, string>) => {
    if (!players) return;
    for (const [uuid, name] of Object.entries(players)) {
      if (!playerNamesRef.current[uuid] && typeof name === 'string') {
        playerNamesRef.current[uuid] = name;
      }
    }
  }, []);

  const getPlayerName = useCallback((uuid: string) => playerNamesRef.current[uuid] || uuid, []);

  const setBoardState = useCallback(
    (stateKey: string, updater: (state: LeaderboardState) => LeaderboardState) => {
      if (stateKey === 'king') {
        setKing((prev) => updater(prev));
        return;
      }

      setBoards((prev) => {
        const current = prev[stateKey] || makeEmptyLeaderboardState();
        return {
          ...prev,
          [stateKey]: updater(current),
        };
      });
    },
    [],
  );

  const loadLeaderboard = useCallback(
    async (metricId: string, stateKey: string, opts?: { openLoadedPage?: boolean }) => {
      setApiError(null);
      const openLoadedPage = opts?.openLoadedPage ?? false;
      const currentState =
        stateKey === 'king'
          ? kingRef.current
          : boardsRef.current[stateKey] || makeEmptyLeaderboardState();

      if (currentState.loading) return;

      setBoardState(stateKey, (state) => ({ ...state, loading: true }));

      try {
        const isSamePageSize = currentState.pageSize === pageSizeRef.current;
        const cursor = currentState.loaded && isSamePageSize ? currentState.nextCursor : null;
        const data = await getLeaderboard(metricId, pageSizeRef.current, cursor);

        if (typeof data.__generated === 'string') {
          setGeneratedIso(data.__generated);
        }

        mergePlayers(data.__players);

        const list = data.boards?.[metricId] || [];
        const nextCursor = data.cursors?.[metricId] || null;

        setBoardState(stateKey, (state) => {
          const pages = cursor ? [...state.pages, list] : [list];
          const nextCurrentPage = cursor
            ? openLoadedPage
              ? pages.length - 1
              : state.currentPage
            : 0;

          return {
            loaded: true,
            loading: false,
            liveStatus: 'ok',
            liveErrorKind: null,
            pages,
            currentPage: nextCurrentPage,
            nextCursor,
            hasMore: !!nextCursor,
            pageSize: pageSizeRef.current,
          };
        });
      } catch (error) {
        console.warn('Leaderboard Fehler', error);
        const liveErrorKind = resolveLeaderboardErrorKind(error);
        setApiError(liveErrorKind === 'rate_limit' ? API_RATE_LIMIT_MESSAGE : API_ERROR_MESSAGE);
        setBoardState(stateKey, (state) => ({
          ...state,
          loading: false,
          liveStatus: state.loaded ? 'stale' : 'error',
          liveErrorKind,
        }));
      }
    },
    [mergePlayers, setBoardState],
  );

  const retrySummary = useCallback(() => {
    setSummaryReloadTrigger((prev) => prev + 1);
  }, []);

  const goToPlayer = useCallback((uuid: string) => {
    window.location.href = `/statistiken/spieler/?uuid=${encodeURIComponent(uuid)}`;
  }, []);

  const setKingCurrentPage = useCallback((pageIndex: number) => {
    setKing((state) => ({ ...state, currentPage: pageIndex }));
  }, []);

  const setActiveMetricCurrentPage = useCallback(
    (pageIndex: number) => {
      if (!activeMetricId) return;
      setBoards((prev) => {
        const current = prev[activeMetricId] || makeEmptyLeaderboardState();
        return {
          ...prev,
          [activeMetricId]: {
            ...current,
            currentPage: pageIndex,
          },
        };
      });
    },
    [activeMetricId],
  );

  useEffect(() => {
    const ac = new AbortController();
    const thresholds = LIVE_WIDGET_THRESHOLDS['stats-kpi'];

    const applySummaryPayload = (data: SummaryResponse): void => {
      if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
      if (typeof data.player_count === 'number') setPlayerCount(data.player_count);
      if (data.totals && typeof data.totals === 'object') {
        setTotals(data.totals as Record<string, number>);
      }
    };

    const applySummaryState = (
      state: LiveDataState<SummaryResponse>,
      options: { initial: boolean; hasRevalidate: boolean },
    ): void => {
      if (ac.signal.aborted) return;

      if (state.data) {
        applySummaryPayload(state.data);
      }
      const timestamp = resolveLastUpdatedTimestamp(state);
      if (timestamp != null) {
        setSummaryLastUpdatedAt(timestamp);
      }

      if (state.status === 'loading') {
        setSummaryLoading(true);
        setSummaryError(null);
        return;
      }

      setSummaryLoaded(true);

      if (state.status === 'stale' && options.initial && options.hasRevalidate) {
        setSummaryLoading(true);
        setSummaryError(null);
        setApiError(null);
        return;
      }

      setSummaryLoading(false);

      if (state.status === 'error' || state.status === 'stale') {
        setSummaryError(API_ERROR_MESSAGE);
        setApiError(API_ERROR_MESSAGE);
        return;
      }

      setSummaryError(null);
      setApiError(null);
    };

    (async () => {
      const resource = getLiveResource(
        SUMMARY_CACHE_KEY,
        async (): Promise<LiveDataState<SummaryResponse>> => {
          try {
            const data = await getSummary(KPI_METRICS, ac.signal);
            const fetchedAt = Date.now();
            return {
              status: 'ok',
              data,
              updatedAt: fetchedAt,
              fetchedAt,
            };
          } catch (error) {
            if ((error as Error)?.name === 'AbortError') {
              return {
                status: 'error',
                fetchedAt: Date.now(),
                error: {
                  kind: 'network',
                  message: 'Anfrage wurde abgebrochen.',
                },
              };
            }

            return {
              status: 'error',
              fetchedAt: Date.now(),
              error: {
                kind: 'unknown',
                message: error instanceof Error ? error.message : API_ERROR_MESSAGE,
              },
            };
          }
        },
        {
          staleAfterMs: thresholds.staleAfterMs,
          maxCacheAgeMs: thresholds.maxCacheAgeMs,
          persist: true,
        },
      );

      applySummaryState(resource.state, {
        initial: true,
        hasRevalidate: resource.revalidate != null,
      });

      if (!resource.revalidate) return;

      const latest = await resource.revalidate;
      applySummaryState(latest, {
        initial: false,
        hasRevalidate: true,
      });

      if (
        !ac.signal.aborted &&
        (latest.status === 'error' || (latest.status === 'stale' && latest.error))
      ) {
        console.warn('Summary Fehler', latest.error ?? latest);
      }
    })();

    return () => ac.abort();
  }, [summaryReloadTrigger]);

  useEffect(() => {
    if (activeTab !== 'ranglisten' || metrics) return;

    const ac = new AbortController();

    (async () => {
      try {
        const data = await getMetrics(ac.signal);
        if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
        const rawMetrics = (data.metrics || {}) as Record<string, MetricDef>;
        const normalized = Object.fromEntries(
          Object.entries(rawMetrics).map(([id, def]) => [
            id,
            {
              ...def,
              label: normalizeUmlauts(def?.label || id),
              category: normalizeUmlauts(def?.category || ''),
            },
          ]),
        ) as Record<string, MetricDef>;
        setMetrics(normalized);
        setApiError(null);
      } catch (error) {
        console.warn('Metrics Fehler', error);
        setApiError(API_ERROR_MESSAGE);
      }
    })();

    return () => ac.abort();
  }, [activeTab, metrics]);

  const filteredMetricIds = useMemo(
    () => filterMetricIds(metrics, metricFilter),
    [metrics, metricFilter],
  );

  const groupedMetrics: GroupedMetrics = useMemo(
    () => groupMetricIds(metrics, filteredMetricIds),
    [metrics, filteredMetricIds],
  );

  useEffect(() => {
    if (activeTab !== 'ranglisten' || !metrics) return;
    if (activeMetricId && filteredMetricIds.includes(activeMetricId)) return;

    setActiveMetricId(pickDefaultRankMetricId(filteredMetricIds, metrics));
  }, [activeTab, metrics, filteredMetricIds, activeMetricId]);

  const activeMetricBoard = activeMetricId ? boards[activeMetricId] : null;
  const activeMetricLoaded = activeMetricBoard?.loaded ?? false;
  const activeMetricLoading = activeMetricBoard?.loading ?? false;
  const activeMetricBoardPageSize = activeMetricBoard?.pageSize ?? null;

  useEffect(() => {
    if (activeTab !== 'king') return;

    const kingNeedsRefresh = !king.loaded || king.pageSize !== pageSize;
    if (kingNeedsRefresh && !king.loading) {
      void loadLeaderboard('king', 'king');
    }
  }, [activeTab, king.loaded, king.loading, king.pageSize, pageSize, loadLeaderboard]);

  useEffect(() => {
    if (activeTab !== 'ranglisten' || !activeMetricId) return;

    const metricNeedsRefresh = !activeMetricLoaded || activeMetricBoardPageSize !== pageSize;
    if (metricNeedsRefresh && !activeMetricLoading) {
      void loadLeaderboard(activeMetricId, activeMetricId);
    }
  }, [
    activeTab,
    activeMetricId,
    activeMetricLoaded,
    activeMetricLoading,
    activeMetricBoardPageSize,
    pageSize,
    loadLeaderboard,
  ]);

  const hasNoRanklistResults = !!metrics && filteredMetricIds.length === 0;

  return {
    generatedIso,
    setGeneratedIso,
    playerCount,
    totals,
    summaryLoaded,
    summaryLoading,
    summaryError,
    summaryLastUpdatedAt,
    retrySummary,
    apiError,
    setApiError,
    mainSearch,
    metrics,
    groupedMetrics,
    filteredMetricIds,
    hasNoRanklistResults,
    king,
    setKingCurrentPage,
    loadMoreKing: () => loadLeaderboard('king', 'king', { openLoadedPage: true }),
    boards,
    activeMetricId,
    setActiveMetricId,
    activeMetricState: activeMetricId
      ? boards[activeMetricId] || makeEmptyLeaderboardState()
      : makeEmptyLeaderboardState(),
    setActiveMetricCurrentPage,
    loadMoreActiveMetric: () => {
      if (!activeMetricId) return Promise.resolve();
      return loadLeaderboard(activeMetricId, activeMetricId, { openLoadedPage: true });
    },
    getPlayerName,
    goToPlayer,
  };
}
