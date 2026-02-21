import { useCallback, useEffect, useMemo, useRef } from 'react';

import { KingSection } from './components/sections/KingSection';
import { OverviewSection } from './components/sections/OverviewSection';
import { RankingsSection } from './components/sections/RankingsSection';
import { getStatsPanelId, getStatsTabId } from './components/StatsNavPills';
import { StatsToolbar } from './components/StatsToolbar';
import { VersusSection } from './components/sections/VersusSection';
import { useStatsData } from './hooks/useStatsData';
import { useStatsState } from './hooks/useStatsState';
import { useStatsUrlState } from './hooks/useStatsUrlState';
import { useVersusState } from './hooks/useVersusState';
import { StatsLayout } from './layout/StatsLayout';
import { filterMetricIds, pickDefaultRankMetricId } from './metric-utils';
import { parseStatsUrlState } from './url-state';
import { normalizeUmlauts } from './normalizeUmlauts';
import type { MetricDef } from './types';

function resolveRankMetricFromCandidates(
  candidates: string[],
  metrics: Record<string, MetricDef> | null,
): string | null {
  if (!metrics) return null;
  if (candidates.length === 0) return null;

  const availableIds = Object.keys(metrics);
  const normalizedAvailable = new Map<string, string>(
    availableIds.map((id) => [id.toLowerCase(), id]),
  );

  for (const rawCandidate of candidates) {
    const candidate = rawCandidate.trim();
    if (!candidate) continue;

    const normalizedCandidate = candidate.toLowerCase();
    const exact = normalizedAvailable.get(normalizedCandidate);
    if (exact) return exact;
  }

  for (const rawCandidate of candidates) {
    const candidate = rawCandidate.trim().toLowerCase();
    if (!candidate) continue;

    const idMatch = availableIds.find((id) => id.toLowerCase().includes(candidate));
    if (idMatch) return idMatch;
  }

  for (const rawCandidate of candidates) {
    const candidate = normalizeUmlauts(rawCandidate.trim()).toLowerCase();
    if (!candidate) continue;

    const fromMeta = availableIds.find((id) => {
      const metricDef = metrics[id];
      const searchable = normalizeUmlauts(
        `${metricDef?.label || ''} ${metricDef?.category || ''}`.trim(),
      ).toLowerCase();
      return searchable.includes(candidate);
    });
    if (fromMeta) return fromMeta;
  }

  return null;
}

export default function StatsApp() {
  const initialUrlState = useMemo(() => parseStatsUrlState(''), []);
  const initialUrlStateHydratedRef = useRef(false);

  const {
    activeTab,
    setTab,
    pageSize,
    setPageSize,
    metricFilter,
    setMetricFilter,
    showWelcome,
    dismissWelcome,
    showPageSize,
    consumeScrollToRestore,
  } = useStatsState({
    initialTab: initialUrlState.tab,
    initialPageSize: initialUrlState.pageSize,
  });

  const {
    setGeneratedIso,
    totals,
    summaryLoaded,
    summaryLoading,
    summaryError,
    summaryLastUpdatedAt,
    retrySummary,
    summaryRetryDisabled,
    summaryRetryInSeconds,
    apiError,
    prefetchRankings,
    mainSearch,
    metrics,
    groupedMetrics,
    hasNoRanklistResults,
    king,
    setKingCurrentPage,
    loadMoreKing,
    reloadKing,
    activeMetricId,
    setActiveMetricId,
    activeMetricState,
    setActiveMetricCurrentPage,
    loadMoreActiveMetric,
    reloadActiveMetric,
    getPlayerName,
    goToPlayer,
  } = useStatsData({
    activeTab,
    pageSize,
    metricFilter,
    initialActiveMetricId: initialUrlState.rankMetricId,
    initialSearchQuery: initialUrlState.searchQuery,
  });

  const versus = useVersusState({
    onGeneratedIso: setGeneratedIso,
    initialState: {
      playerA: initialUrlState.versus.playerA,
      playerB: initialUrlState.versus.playerB,
      autoCompare: initialUrlState.versus.shouldAutoCompare,
    },
  });
  const tabsDisabled = false;
  const pendingRankMetricCandidatesRef = useRef<string[] | null>(null);
  const runVersusCompare = versus.runVersusCompare;
  const mobileSearchVersusSlot = useMemo<'A' | 'B' | null>(() => {
    if (activeTab !== 'versus') return null;
    if (versus.searchA.open) return 'A';
    if (versus.searchB.open) return 'B';
    if (!versus.versusPlayerA) return 'A';
    if (!versus.versusPlayerB) return 'B';
    return null;
  }, [
    activeTab,
    versus.searchA.open,
    versus.searchB.open,
    versus.versusPlayerA,
    versus.versusPlayerB,
  ]);
  const toolbarLiveVariant = useMemo(() => {
    if (summaryRetryDisabled) return 'rate_limit';
    if (summaryError) return summaryLastUpdatedAt ? 'stale' : 'error';
    if (summaryLoading && summaryLoaded) return 'stale';

    if (activeTab === 'king') {
      if (king.liveErrorKind === 'rate_limit') return 'rate_limit';
      if (king.liveStatus === 'stale') return 'stale';
      if (king.liveStatus === 'error') return king.loaded ? 'stale' : 'error';
    }

    if (activeTab === 'ranglisten') {
      if (activeMetricState.liveErrorKind === 'rate_limit') return 'rate_limit';
      if (activeMetricState.liveStatus === 'stale') return 'stale';
      if (activeMetricState.liveStatus === 'error') {
        return activeMetricState.loaded ? 'stale' : 'error';
      }
    }

    return 'ok';
  }, [
    activeMetricState.liveErrorKind,
    activeMetricState.liveStatus,
    activeMetricState.loaded,
    activeTab,
    king.liveErrorKind,
    king.liveStatus,
    king.loaded,
    summaryError,
    summaryLastUpdatedAt,
    summaryLoaded,
    summaryLoading,
    summaryRetryDisabled,
  ]);
  const handleReload = useCallback(() => {
    if (activeTab === 'uebersicht') {
      retrySummary();
      return;
    }

    if (activeTab === 'king') {
      void reloadKing();
      return;
    }

    if (activeTab === 'ranglisten') {
      void reloadActiveMetric();
      return;
    }

    if (activeTab === 'versus') {
      void runVersusCompare();
    }
  }, [activeTab, reloadActiveMetric, reloadKing, retrySummary, runVersusCompare]);

  useEffect(() => {
    if (activeTab !== 'uebersicht') return;

    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const runPrefetch = () => {
      void prefetchRankings();
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(runPrefetch, { timeout: 2_500 });
    } else {
      timeoutId = window.setTimeout(runPrefetch, 1_200);
    }

    return () => {
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeTab, prefetchRankings]);
  const handleSelectMetric = useCallback(
    (id: string) => {
      if (id === activeMetricId) return;
      setActiveMetricId(id);
    },
    [activeMetricId, setActiveMetricId],
  );
  const defaultRankMetricId = useMemo(() => {
    if (!metrics) return null;
    return pickDefaultRankMetricId(filterMetricIds(metrics, ''), metrics);
  }, [metrics]);
  const handleResetRankings = useCallback(() => {
    setMetricFilter('');
    setActiveMetricId(defaultRankMetricId);
  }, [defaultRankMetricId, setActiveMetricId, setMetricFilter]);
  const handleOpenRankingsFromOverview = useCallback(
    (metricId?: string | string[]) => {
      setMetricFilter('');

      const candidates =
        typeof metricId === 'string' ? [metricId] : Array.isArray(metricId) ? metricId : [];
      const normalizedCandidates = candidates
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate.length > 0);

      if (normalizedCandidates.length > 0) {
        const resolved = resolveRankMetricFromCandidates(normalizedCandidates, metrics);

        if (resolved) {
          pendingRankMetricCandidatesRef.current = null;
          setActiveMetricId(resolved);
        } else {
          pendingRankMetricCandidatesRef.current = normalizedCandidates;
          setActiveMetricId(normalizedCandidates[0]);
        }
      }

      setTab('ranglisten');
    },
    [metrics, setActiveMetricId, setMetricFilter, setTab],
  );
  useEffect(() => {
    if (activeTab !== 'ranglisten') return;

    const candidates = pendingRankMetricCandidatesRef.current;
    if (!candidates || candidates.length === 0) return;

    const resolved = resolveRankMetricFromCandidates(candidates, metrics);
    if (!resolved) return;

    pendingRankMetricCandidatesRef.current = null;
    setActiveMetricId(resolved);
  }, [activeTab, metrics, setActiveMetricId]);

  const handlePopState = useCallback(
    (state: ReturnType<typeof parseStatsUrlState>) => {
      setTab(state.tab);
      setPageSize(state.pageSize);
      setActiveMetricId(state.rankMetricId);
      mainSearch.setValueWithoutAutoOpen(state.searchQuery);
      versus.applyUrlState({
        playerAUuid: state.versus.playerA?.uuid || null,
        playerBUuid: state.versus.playerB?.uuid || null,
        autoCompare: state.versus.shouldAutoCompare,
      });
    },
    [mainSearch, setActiveMetricId, setPageSize, setTab, versus],
  );

  useEffect(() => {
    if (initialUrlStateHydratedRef.current) return;
    initialUrlStateHydratedRef.current = true;
    if (typeof window === 'undefined') return;
    if (!window.location.search) return;
    handlePopState(parseStatsUrlState(window.location.search));
  }, [handlePopState]);

  useStatsUrlState({
    activeTab,
    pageSize,
    activeMetricId,
    searchQuery: mainSearch.value,
    versusPlayerA: versus.versusPlayerA,
    versusPlayerB: versus.versusPlayerB,
    onPopState: handlePopState,
  });

  useEffect(() => {
    const y = consumeScrollToRestore();
    if (y === null) return;
    window.scrollTo({ top: y, left: 0, behavior: 'auto' });
  }, [activeTab, consumeScrollToRestore]);

  return (
    <StatsLayout
      stickyTopBar
      topBarClassName="py-0 md:py-4"
      topBar={
        <StatsToolbar
          activeTab={activeTab}
          onTabChange={setTab}
          tabsDisabled={tabsDisabled}
          search={mainSearch}
          onChoosePlayer={goToPlayer}
          activeVersusSlot={mobileSearchVersusSlot}
          onChooseVersusPlayer={versus.setVersusPlayer}
          showPageSize={showPageSize}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          liveVariant={toolbarLiveVariant}
          updatedAt={summaryLastUpdatedAt}
          apiError={apiError}
          onReload={handleReload}
          reloadDisabled={summaryRetryDisabled}
          reloadInSeconds={summaryRetryInSeconds}
        />
      }
    >
      {activeTab === 'uebersicht' ? (
        <section
          role="tabpanel"
          id={getStatsPanelId('uebersicht')}
          aria-labelledby={getStatsTabId('uebersicht')}
        >
          <OverviewSection
            showWelcome={showWelcome}
            onDismissWelcome={dismissWelcome}
            onOpenRankings={handleOpenRankingsFromOverview}
            navigationDisabled={tabsDisabled}
            totals={totals}
            summaryLoaded={summaryLoaded}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            onRetrySummary={retrySummary}
            summaryRetryDisabled={summaryRetryDisabled}
            summaryRetryInSeconds={summaryRetryInSeconds}
          />
        </section>
      ) : null}

      {activeTab === 'king' ? (
        <section
          role="tabpanel"
          id={getStatsPanelId('king')}
          aria-labelledby={getStatsTabId('king')}
        >
          <KingSection
            king={king}
            pageSize={pageSize}
            getPlayerName={getPlayerName}
            onPlayerClick={goToPlayer}
            onGoPage={setKingCurrentPage}
            onLoadMore={() => {
              void loadMoreKing();
            }}
          />
        </section>
      ) : null}

      {activeTab === 'ranglisten' ? (
        <section
          role="tabpanel"
          id={getStatsPanelId('ranglisten')}
          aria-labelledby={getStatsTabId('ranglisten')}
        >
          <RankingsSection
            metrics={metrics}
            groupedMetrics={groupedMetrics}
            metricFilter={metricFilter}
            onMetricFilterChange={setMetricFilter}
            activeMetricId={activeMetricId}
            onSelectMetric={handleSelectMetric}
            onReset={handleResetRankings}
            hasNoRanklistResults={hasNoRanklistResults}
            activeMetricState={activeMetricState}
            pageSize={pageSize}
            getPlayerName={getPlayerName}
            onPlayerClick={goToPlayer}
            onGoPage={setActiveMetricCurrentPage}
            onLoadMore={() => {
              void loadMoreActiveMetric();
            }}
          />
        </section>
      ) : null}

      {activeTab === 'versus' ? (
        <section
          role="tabpanel"
          id={getStatsPanelId('versus')}
          aria-labelledby={getStatsTabId('versus')}
        >
          <VersusSection
            maxMetrics={versus.maxMetrics}
            searchA={versus.searchA}
            searchB={versus.searchB}
            versusMetricFilter={versus.versusMetricFilter}
            onVersusMetricFilterChange={versus.setVersusMetricFilter}
            versusMetricIds={versus.versusMetricIds}
            versusPlayerA={versus.versusPlayerA}
            versusPlayerB={versus.versusPlayerB}
            versusCatalog={versus.versusCatalog}
            versusLoading={versus.versusLoading}
            versusError={versus.versusError}
            versusNotice={versus.versusNotice}
            versusFilteredCatalog={versus.versusFilteredCatalog}
            versusGroupedMetrics={versus.versusGroupedMetrics}
            hasNoVersusResults={versus.hasNoVersusResults}
            isSameVersusPlayer={versus.isSameVersusPlayer}
            canRunVersus={versus.canRunVersus}
            versusSwapFxClass={versus.versusSwapFxClass}
            versusCardAZClass={versus.versusCardAZClass}
            versusCardBZClass={versus.versusCardBZClass}
            hasVersusData={versus.hasVersusData}
            versusRows={versus.versusRows}
            versusSummary={versus.versusSummary}
            hasVersusResults={versus.hasVersusResults}
            hasMissingVersusValues={versus.hasMissingVersusValues}
            onSetVersusPlayer={versus.setVersusPlayer}
            onClearVersusPlayer={versus.clearVersusPlayer}
            onSetVersusSearchOpen={versus.setVersusSearchOpen}
            onSwapVersusPlayers={versus.swapVersusPlayers}
            onUpdateVersusSearch={versus.updateVersusSearch}
            onRunVersusCompare={() => {
              void versus.runVersusCompare();
            }}
            onApplyVersusSelection={versus.applyVersusSelection}
            onToggleVersusMetric={versus.toggleVersusMetric}
            onResetVersus={versus.resetVersus}
            onGoToPlayer={goToPlayer}
          />
        </section>
      ) : null}
    </StatsLayout>
  );
}
