import { SearchX } from 'lucide-react';

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
  hasNoRanklistResults: boolean;
  activeMetricState: LeaderboardState;
  pageSize: number;
  getPlayerName: (uuid: string) => string;
  onPlayerClick: (uuid: string) => void;
  onGoPage: (pageIndex: number) => void;
  onLoadMore: () => void;
}) {
  return (
    <section aria-label="Ranglisten" className="mg-container pb-12">
      <div className="mt-6">
        <SectionTitle
          title="Ranglisten"
          subtitle="Waehle links eine Kategorie aus und sieh direkt, wer in diesem Bereich vorne liegt."
        />

        {hasNoRanklistResults ? (
          <div
            className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
            role="status"
          >
            <span
              className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
              aria-hidden="true"
            >
              <SearchX size={14} />
            </span>
            <span className="text-fg/90">Keine Ranglisten gefunden.</span>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
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
            {metrics && activeMetricId ? (
              <div className="mg-card p-4">
                <p className="text-muted text-xs font-semibold">Aktive Rangliste</p>
                <p className="text-fg mt-1 text-lg font-semibold tracking-tight">
                  {metrics[activeMetricId]?.label || activeMetricId}
                </p>
                <p className="text-muted mt-2 text-sm">
                  Kategorie:{' '}
                  <span className="text-fg/80">{metrics[activeMetricId]?.category || '-'}</span>
                  <span className="text-muted"> - </span>
                  ID: <span className="text-fg/80">{activeMetricId}</span>
                  {metrics[activeMetricId]?.unit ? (
                    <>
                      <span className="text-muted"> - </span>
                      Einheit: <span className="text-fg/80">{metrics[activeMetricId]?.unit}</span>
                    </>
                  ) : null}
                </p>
              </div>
            ) : (
              <div className="mg-card p-6">
                <p className="text-fg font-semibold">Keine Rangliste ausgewaehlt</p>
                <p className="text-muted mt-2 text-sm">
                  Waehle links eine Kategorie aus, um die Top-Werte zu sehen.
                </p>
              </div>
            )}

            {metrics && activeMetricId ? (
              <LeaderboardTable
                def={metrics[activeMetricId]}
                state={activeMetricState}
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
