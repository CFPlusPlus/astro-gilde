import { useEffect, useMemo, useRef } from 'react';
import { RotateCcw, SearchX } from 'lucide-react';

import type { GroupedMetrics } from '../MetricPicker';
import { LeaderboardTable } from '../LeaderboardTable';
import { MetricPicker } from '../MetricPicker';
import { SectionTitle } from '../StatsPrimitives';
import type { MetricDef } from '../../types';
import type { LeaderboardState } from '../../types-ui';

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
    <section aria-label="Ranglisten" className="mg-container pb-12">
      <div className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            title="Ranglisten"
            subtitle="W&auml;hle links eine Kategorie aus und sieh direkt, wer in diesem Bereich vorne liegt."
          />
          <button
            type="button"
            onClick={onReset}
            className="mg-btn mg-btn--sm mg-btn--surface group"
          >
            <RotateCcw size={15} className="text-muted group-hover:text-accent transition-colors" />
            Zur&uuml;cksetzen
          </button>
        </div>

        {hasNoRanklistResults ? (
          <div className="mg-notice" data-variant="warning" role="status">
            <span
              className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
              aria-hidden="true"
            >
              <SearchX size={14} />
            </span>
            <span className="text-fg/90">Keine Ranglisten gefunden.</span>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 [overflow-anchor:none] lg:grid-cols-[360px_1fr]">
          {!metrics ? (
            <div className="mg-card text-muted p-5 text-sm">Lade Ranglisten...</div>
          ) : (
            <MetricPicker
              metrics={metrics}
              grouped={groupedMetrics}
              filter={metricFilter}
              onFilterChange={onMetricFilterChange}
              activeMetricId={activeMetricId}
              onSelectMetric={onSelectMetric}
            />
          )}

          <div className="min-w-0 space-y-3">
            <div className="mg-surface-2 p-4">
              {!metrics ? (
                <div className="mg-notice text-sm" data-variant="neutral" role="status">
                  Lade Ranglisten...
                </div>
              ) : null}

              {metrics && !activeMetricId ? (
                <div className="mg-notice text-sm" data-variant="neutral" role="status">
                  <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
                  <span className="text-fg/90">
                    Keine Rangliste ausgew&auml;hlt. W&auml;hle links eine Kategorie aus.
                  </span>
                </div>
              ) : null}

              {metrics && activeMetricId ? (
                <>
                  <p className="text-muted text-xs font-semibold">Aktive Rangliste</p>
                  <p
                    className="text-fg mt-1 truncate text-lg font-semibold tracking-tight"
                    title={metrics[activeMetricId]?.label || activeMetricId}
                  >
                    {metrics[activeMetricId]?.label || activeMetricId}
                  </p>
                  <ul className="mg-list divide-border/75 mt-3 divide-y text-sm">
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
                </>
              ) : null}
            </div>

            {metrics && activeMetricId ? (
              <LeaderboardTable
                metricKey={tableMetricKey || activeMetricId}
                def={metrics[activeMetricId]}
                state={tableState}
                loadingOverride={activeMetricState.loading}
                showCenterLoader={activeMetricState.loading && !activeMetricState.loaded}
                centerLoaderLabel={
                  canUseLoadedFallback
                    ? 'Neue Rangliste wird geladen...'
                    : 'Rangliste wird geladen...'
                }
                pageSize={pageSize}
                getPlayerName={getPlayerName}
                onPlayerClick={onPlayerClick}
                onGoPage={onGoPage}
                onLoadMore={onLoadMore}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
