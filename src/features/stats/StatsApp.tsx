import { useCallback, useEffect, useMemo } from 'react';

import { KingSection } from './components/sections/KingSection';
import { OverviewSection } from './components/sections/OverviewSection';
import { RankingsSection } from './components/sections/RankingsSection';
import { StatsHeader } from './components/sections/StatsHeader';
import { VersusSection } from './components/sections/VersusSection';
import { useStatsData } from './hooks/useStatsData';
import { useStatsState } from './hooks/useStatsState';
import { useVersusState } from './hooks/useVersusState';
import { filterMetricIds, pickDefaultRankMetricId } from './metric-utils';
import { buildStatsUrlSearch, parseStatsUrlState } from './url-state';

export default function StatsApp() {
  const initialUrlState = useMemo(
    () =>
      typeof window === 'undefined'
        ? parseStatsUrlState('')
        : parseStatsUrlState(window.location.search),
    [],
  );
  const canAutoCompareFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.replace('#', '').trim() === 'versus';
  }, []);

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
  } = useStatsState();

  const {
    generatedIso,
    setGeneratedIso,
    playerCount,
    totals,
    apiError,
    mainSearch,
    metrics,
    groupedMetrics,
    hasNoRanklistResults,
    king,
    setKingCurrentPage,
    loadMoreKing,
    activeMetricId,
    setActiveMetricId,
    activeMetricState,
    setActiveMetricCurrentPage,
    loadMoreActiveMetric,
    getPlayerName,
    goToPlayer,
  } = useStatsData({
    activeTab,
    pageSize,
    metricFilter,
    initialActiveMetricId: initialUrlState.rankMetricId,
  });

  const versus = useVersusState({
    onGeneratedIso: setGeneratedIso,
    initialState: {
      playerA: initialUrlState.versus.playerA,
      playerB: initialUrlState.versus.playerB,
      metricFilter: initialUrlState.versus.metricFilter,
      metricIds: initialUrlState.versus.metricIds,
      autoCompare: initialUrlState.versus.shouldAutoCompare && canAutoCompareFromUrl,
    },
  });
  const tabsDisabled = Boolean(apiError);
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
  const rankMetricIdForUrl = useMemo(() => {
    if (!activeMetricId) return null;
    if (metricFilter.trim().length > 0) return activeMetricId;
    return activeMetricId === defaultRankMetricId ? null : activeMetricId;
  }, [activeMetricId, defaultRankMetricId, metricFilter]);
  const handleResetRankings = useCallback(() => {
    setMetricFilter('');
    setActiveMetricId(defaultRankMetricId);
  }, [defaultRankMetricId, setActiveMetricId, setMetricFilter]);

  useEffect(() => {
    const y = consumeScrollToRestore();
    if (y === null) return;
    window.scrollTo({ top: y, left: 0, behavior: 'auto' });
  }, [activeTab, consumeScrollToRestore]);

  useEffect(() => {
    const nextSearch =
      activeTab === 'ranglisten'
        ? buildStatsUrlSearch({
            activeMetricId: rankMetricIdForUrl,
            versusMetricFilter: '',
            versusMetricIds: [],
            versusPlayerA: null,
            versusPlayerB: null,
          })
        : activeTab === 'versus'
          ? buildStatsUrlSearch({
              activeMetricId: null,
              versusMetricFilter: versus.versusMetricFilter,
              versusMetricIds: versus.versusMetricIds,
              versusPlayerA: versus.versusPlayerA,
              versusPlayerB: versus.versusPlayerB,
            })
          : '';

    if (window.location.search === nextSearch) return;

    try {
      const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    } catch {
      // Unkritisch: History-API kann blockiert sein.
    }
  }, [
    activeTab,
    rankMetricIdForUrl,
    versus.versusMetricFilter,
    versus.versusMetricIds,
    versus.versusPlayerA,
    versus.versusPlayerB,
  ]);

  return (
    <div>
      <StatsHeader
        activeTab={activeTab}
        onTabChange={setTab}
        tabsDisabled={tabsDisabled}
        search={mainSearch}
        onChoosePlayer={goToPlayer}
        playerCount={playerCount}
        generatedIso={generatedIso}
        showPageSize={showPageSize}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        apiError={apiError}
      />

      {activeTab === 'uebersicht' ? (
        <OverviewSection
          showWelcome={showWelcome}
          onDismissWelcome={dismissWelcome}
          totals={totals}
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
    </div>
  );
}
