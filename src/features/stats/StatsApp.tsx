import { useCallback, useEffect, useMemo } from 'react';

import { KingSection } from './components/sections/KingSection';
import { OverviewSection } from './components/sections/OverviewSection';
import { RankingsSection } from './components/sections/RankingsSection';
import { StatsToolbar } from './components/StatsToolbar';
import { VersusSection } from './components/sections/VersusSection';
import { useStatsData } from './hooks/useStatsData';
import { useStatsState } from './hooks/useStatsState';
import { useStatsUrlState } from './hooks/useStatsUrlState';
import { useVersusState } from './hooks/useVersusState';
import { StatsLayout } from './layout/StatsLayout';
import { filterMetricIds, pickDefaultRankMetricId } from './metric-utils';
import { parseStatsUrlState } from './url-state';

export default function StatsApp() {
  const initialUrlState = useMemo(
    () =>
      typeof window === 'undefined'
        ? parseStatsUrlState('')
        : parseStatsUrlState(window.location.search),
    [],
  );

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
  const tabsDisabled = Boolean(apiError);
  const runVersusCompare = versus.runVersusCompare;
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
    retrySummary();

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
      topBarClassName="py-4"
      topBar={
        <StatsToolbar
          activeTab={activeTab}
          onTabChange={setTab}
          tabsDisabled={tabsDisabled}
          search={mainSearch}
          onChoosePlayer={goToPlayer}
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
        <OverviewSection
          showWelcome={showWelcome}
          onDismissWelcome={dismissWelcome}
          totals={totals}
          summaryLoaded={summaryLoaded}
          summaryLoading={summaryLoading}
          summaryError={summaryError}
          summaryLastUpdatedAt={summaryLastUpdatedAt}
          onRetrySummary={retrySummary}
          summaryRetryDisabled={summaryRetryDisabled}
          summaryRetryInSeconds={summaryRetryInSeconds}
        />
      ) : null}

      {activeTab === 'king' ? (
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
      ) : null}

      {activeTab === 'ranglisten' ? (
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
      ) : null}

      {activeTab === 'versus' ? (
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
      ) : null}
    </StatsLayout>
  );
}
