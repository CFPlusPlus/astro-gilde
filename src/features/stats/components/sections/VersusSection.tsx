import {
  VersusMetricPicker,
  VersusPlayerPicker,
  VersusResults,
  type VersusSectionProps,
} from '../versus';
import { StatsLayoutGrid, StatsLayoutMain } from '../../layout/StatsLayout';
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
    <StatsLayoutGrid className="[overflow-anchor:none]">
      <StatsLayoutMain ariaLabel="Versus Vergleich" className="lg:col-span-12">
        <SectionTitle title="Versus" subtitle="Vergleiche zwei Spieler direkt nebeneinander." />

        <div className="mt-5 space-y-5">
          <section>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-fg text-sm font-semibold">Spielerauswahl</h3>
              <span className="text-muted text-xs">
                Definiere Spieler A und B für den Vergleich.
              </span>
            </div>
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
              surface={false}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-fg text-sm font-semibold">Kategorien</h3>
                <span className="text-muted text-xs">
                  Wähle aus, was im Vergleich gezeigt wird.
                </span>
              </div>
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
                surface={false}
              />
            </div>
            <div className="min-w-0 xl:col-span-7">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-fg text-sm font-semibold">Ergebnis</h3>
                <span className="text-muted text-xs">Zwischenstand und Detailvergleich.</span>
              </div>
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
                surface={false}
              />
            </div>
          </section>
        </div>
      </StatsLayoutMain>
    </StatsLayoutGrid>
  );
}
