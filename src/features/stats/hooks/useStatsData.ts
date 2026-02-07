import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getLeaderboard, getMetrics, getSummary } from '../api';
import { KPI_METRICS } from '../constants';
import { filterMetricIds, groupMetricIds, pickDefaultRankMetricId } from '../metric-utils';
import type { MetricDef } from '../types';
import type { LeaderboardState, TabKey } from '../types-ui';
import { usePlayerAutocomplete } from '../usePlayerAutocomplete';
import type { GroupedMetrics } from '../components/MetricPicker';

const API_ERROR_MESSAGE =
  'Statistiken sind aktuell nicht erreichbar. Bitte versuche es spaeter erneut.';

function makeEmptyLeaderboardState(): LeaderboardState {
  return {
    loaded: false,
    loading: false,
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
}: {
  activeTab: TabKey;
  pageSize: number;
  metricFilter: string;
}) {
  const [generatedIso, setGeneratedIso] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<Record<string, MetricDef> | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [king, setKing] = useState<LeaderboardState>(makeEmptyLeaderboardState);
  const [boards, setBoards] = useState<Record<string, LeaderboardState>>({});
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);

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
            pages,
            currentPage: nextCurrentPage,
            nextCursor,
            hasMore: !!nextCursor,
            pageSize: pageSizeRef.current,
          };
        });
      } catch (error) {
        console.warn('Leaderboard Fehler', error);
        setApiError(API_ERROR_MESSAGE);
        setBoardState(stateKey, (state) => ({ ...state, loading: false }));
      }
    },
    [mergePlayers, setBoardState],
  );

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

    (async () => {
      try {
        const data = await getSummary(KPI_METRICS, ac.signal);
        if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
        if (typeof data.player_count === 'number') setPlayerCount(data.player_count);
        if (data.totals && typeof data.totals === 'object') {
          setTotals(data.totals as Record<string, number>);
        }
        setApiError(null);
      } catch (error) {
        console.warn('Summary Fehler', error);
        setApiError(API_ERROR_MESSAGE);
      }
    })();

    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (activeTab !== 'ranglisten' || metrics) return;

    const ac = new AbortController();

    (async () => {
      try {
        const data = await getMetrics(ac.signal);
        if (typeof data.__generated === 'string') setGeneratedIso(data.__generated);
        setMetrics((data.metrics || {}) as Record<string, MetricDef>);
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
