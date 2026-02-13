import {
  VersusMetricPicker,
  VersusPlayerPicker,
  VersusResults,
  type VersusSectionProps,
} from '../versus';
import { SectionTitle } from '../StatsPrimitives';

export function VersusSection({
  maxMetrics,
  searchA,
  searchB,
  versusMetricFilter,
  onVersusMetricFilterChange,
  versusMetricIds,
  versusPlayerA,
  versusPlayerB,
  versusCatalog,
  versusLoading,
  versusError,
  versusNotice,
  versusFilteredCatalog,
  versusGroupedMetrics,
  hasNoVersusResults,
  isSameVersusPlayer,
  canRunVersus,
  versusSwapFxClass,
  versusCardAZClass,
  versusCardBZClass,
  hasVersusData,
  versusRows,
  versusSummary,
  hasVersusResults,
  hasMissingVersusValues,
  onSetVersusPlayer,
  onClearVersusPlayer,
  onSetVersusSearchOpen,
  onSwapVersusPlayers,
  onUpdateVersusSearch,
  onRunVersusCompare,
  onApplyVersusSelection,
  onToggleVersusMetric,
  onResetVersus,
  onGoToPlayer,
}: VersusSectionProps) {
  return (
    <section aria-label="Versus" className="mg-container pb-12">
      <div className="mt-6 space-y-6">
        <SectionTitle
          title="Versus"
          subtitle="Vergleiche zwei Spieler in ausgew&auml;hlten Kategorien."
        />

        <VersusPlayerPicker
          maxMetrics={maxMetrics}
          searchA={searchA}
          searchB={searchB}
          versusPlayerA={versusPlayerA}
          versusPlayerB={versusPlayerB}
          versusError={versusError}
          versusNotice={versusNotice}
          isSameVersusPlayer={isSameVersusPlayer}
          canRunVersus={canRunVersus}
          versusSwapFxClass={versusSwapFxClass}
          versusCardAZClass={versusCardAZClass}
          versusCardBZClass={versusCardBZClass}
          onSetVersusPlayer={onSetVersusPlayer}
          onClearVersusPlayer={onClearVersusPlayer}
          onSetVersusSearchOpen={onSetVersusSearchOpen}
          onSwapVersusPlayers={onSwapVersusPlayers}
          onUpdateVersusSearch={onUpdateVersusSearch}
          onRunVersusCompare={onRunVersusCompare}
          onResetVersus={onResetVersus}
          onGoToPlayer={onGoToPlayer}
        />

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <VersusMetricPicker
            maxMetrics={maxMetrics}
            versusMetricFilter={versusMetricFilter}
            versusMetricIds={versusMetricIds}
            versusCatalog={versusCatalog}
            versusFilteredCatalog={versusFilteredCatalog}
            versusGroupedMetrics={versusGroupedMetrics}
            hasNoVersusResults={hasNoVersusResults}
            hasVersusData={hasVersusData}
            onVersusMetricFilterChange={onVersusMetricFilterChange}
            onApplyVersusSelection={onApplyVersusSelection}
            onToggleVersusMetric={onToggleVersusMetric}
          />

          <VersusResults
            versusPlayerA={versusPlayerA}
            versusPlayerB={versusPlayerB}
            hasVersusData={hasVersusData}
            versusLoading={versusLoading}
            versusMetricIds={versusMetricIds}
            hasVersusResults={hasVersusResults}
            versusSummary={versusSummary}
            hasMissingVersusValues={hasMissingVersusValues}
            versusRows={versusRows}
          />
        </div>
      </div>
    </section>
  );
}
