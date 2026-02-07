import { useEffect } from 'react';

import { KingSection } from './components/sections/KingSection';
import { OverviewSection } from './components/sections/OverviewSection';
import { RankingsSection } from './components/sections/RankingsSection';
import { StatsHeader } from './components/sections/StatsHeader';
import { VersusSection } from './components/sections/VersusSection';
import { useStatsData } from './hooks/useStatsData';
import { useStatsState } from './hooks/useStatsState';
import { useVersusState } from './hooks/useVersusState';

export default function StatsApp() {
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
    markScrollForRestore,
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
  });

  const versus = useVersusState({
    onGeneratedIso: setGeneratedIso,
  });
  const tabsDisabled = Boolean(apiError);

  useEffect(() => {
    const y = consumeScrollToRestore();
    if (y === null) return;
    window.scrollTo({ top: y, left: 0, behavior: 'auto' });
  }, [activeTab, activeMetricId, consumeScrollToRestore]);

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
          onSelectMetric={(id) => {
            if (id === activeMetricId) return;
            markScrollForRestore();
            setActiveMetricId(id);
          }}
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
