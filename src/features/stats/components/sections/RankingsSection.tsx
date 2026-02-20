import { useEffect, useMemo, useRef } from 'react';
import { RotateCcw, SearchX } from 'lucide-react';

import type { GroupedMetrics } from '../MetricPicker';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { LeaderboardTable } from '../LeaderboardTable';
import { MetricPicker } from '../MetricPicker';
import { SectionTitle } from '../StatsPrimitives';
import type { MetricDef } from '../../types';
import type { LeaderboardState } from '../../types-ui';
import { LIVE_COPY_DE } from '../../../../lib/live/copy.de';

export function RankingsSection({
  metrics,
  groupedMetrics,
  metricFilter,
  onMetricFilterChange,
  activeMetricId,
  onSelectMetric,
  onReset,
  hasNoRanklistResults,
  activeMetricState,
  pageSize,
  getPlayerName,
  onPlayerClick,
  onGoPage,
  onLoadMore,
}: {
  metrics: Record<string, MetricDef> | null;
  groupedMetrics: GroupedMetrics;
  metricFilter: string;
  onMetricFilterChange: (next: string) => void;
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
  onReset: () => void;
  hasNoRanklistResults: boolean;
  activeMetricState: LeaderboardState;
  pageSize: number;
  getPlayerName: (uuid: string) => string;
  onPlayerClick: (uuid: string) => void;
  onGoPage: (pageIndex: number) => void;
  onLoadMore: () => void;
}) {
  const lastLoadedMetricRef = useRef<{ id: string; state: LeaderboardState } | null>(null);

  useEffect(() => {
    if (!activeMetricId || !activeMetricState.loaded) return;
    lastLoadedMetricRef.current = { id: activeMetricId, state: activeMetricState };
  }, [activeMetricId, activeMetricState]);

  const canUseLoadedFallback = useMemo(() => {
    if (!activeMetricId) return false;
    if (activeMetricState.loaded) return false;
    if (!lastLoadedMetricRef.current) return false;
    return lastLoadedMetricRef.current.id !== activeMetricId;
  }, [activeMetricId, activeMetricState.loaded]);

  const tableState = canUseLoadedFallback
    ? (lastLoadedMetricRef.current?.state ?? activeMetricState)
    : activeMetricState;
  const tableMetricKey = canUseLoadedFallback
    ? (lastLoadedMetricRef.current?.id ?? activeMetricId)
    : activeMetricId;

  return (
    <StatsLayoutGrid className="[overflow-anchor:none]">
      <StatsLayoutRail ariaLabel="Ranglisten Kategorien">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
          <button
            type="button"
            onClick={onReset}
            className="mg-btn mg-btn--sm mg-btn--surface group"
          >
            <RotateCcw size={15} className="text-muted group-hover:text-accent transition-colors" />
            Zurücksetzen
          </button>
        </div>

        <div className="mt-4">
          {metrics ? (
            <MetricPicker
              metrics={metrics}
              grouped={groupedMetrics}
              filter={metricFilter}
              onFilterChange={onMetricFilterChange}
              activeMetricId={activeMetricId}
              onSelectMetric={onSelectMetric}
              surface={false}
            />
          ) : null}
        </div>
      </StatsLayoutRail>

      <StatsLayoutMain ariaLabel="Ranglisten Ergebnisse">
        <SectionTitle
          title="Ranglisten"
          subtitle="Wähle links eine Kategorie aus und sieh direkt, wer in diesem Bereich vorne liegt."
        />

        <div className="mt-5 space-y-4">
          {!metrics ? (
            <div className="mg-notice text-sm" data-variant="neutral" role="status">
              {LIVE_COPY_DE.rankings_loading}
            </div>
          ) : null}

          {metrics && hasNoRanklistResults ? (
            <div className="mg-notice text-sm" data-variant="warning" role="status">
              <span
                className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
                aria-hidden="true"
              >
                <SearchX size={14} />
              </span>
              <span className="text-fg/90">Keine Ranglisten gefunden.</span>
            </div>
          ) : null}

          {metrics && !activeMetricId ? (
            <div className="mg-notice text-sm" data-variant="neutral" role="status">
              <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
              <span className="text-fg/90">
                Keine Rangliste ausgewählt. Wähle links eine Kategorie aus.
              </span>
            </div>
          ) : null}

          {metrics && activeMetricId ? (
            <>
              <div>
                <p className="text-muted text-xs font-semibold">Aktive Rangliste</p>
                <ul className="mg-list divide-border/75 mt-2 divide-y text-sm">
                  <li className="flex items-center justify-between gap-3 px-1 py-2">
                    <span className="text-muted">Name</span>
                    <span
                      className="text-fg truncate text-right font-semibold"
                      title={metrics[activeMetricId]?.label || activeMetricId}
                    >
                      {metrics[activeMetricId]?.label || activeMetricId}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3 px-1 py-2">
                    <span className="text-muted">Kategorie</span>
                    <span className="text-fg/85 truncate text-right">
                      {metrics[activeMetricId]?.category || '-'}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3 px-1 py-2">
                    <span className="text-muted">ID</span>
                    <span className="text-fg/85 truncate text-right">{activeMetricId}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3 px-1 py-2">
                    <span className="text-muted">Einheit</span>
                    <span className="text-fg/85 truncate text-right">
                      {metrics[activeMetricId]?.unit || '-'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="min-w-0">
                <LeaderboardTable
                  metricKey={tableMetricKey || activeMetricId}
                  def={metrics[activeMetricId]}
                  state={tableState}
                  loadingOverride={activeMetricState.loading}
                  showCenterLoader={activeMetricState.loading && !activeMetricState.loaded}
                  centerLoaderLabel={
                    canUseLoadedFallback
                      ? LIVE_COPY_DE.table_loading_next
                      : LIVE_COPY_DE.table_loading
                  }
                  pageSize={pageSize}
                  getPlayerName={getPlayerName}
                  onPlayerClick={onPlayerClick}
                  onGoPage={onGoPage}
                  onLoadMore={onLoadMore}
                  surface={false}
                />
              </div>
            </>
          ) : null}
        </div>
      </StatsLayoutMain>
    </StatsLayoutGrid>
  );
}
