import { useEffect, useMemo, useRef, useState } from 'react';
import { ListFilter, RotateCcw, SearchX, X } from 'lucide-react';

import type { GroupedMetrics } from '../MetricPicker';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { LeaderboardTable } from '../LeaderboardTable';
import { MetricPicker } from '../MetricPicker';
import { LiveBadgeSlot, type LiveBadgeVariant } from '../LiveBadge';
import { SectionTitle } from '../StatsPrimitives';
import type { MetricDef } from '../../types';
import type { LeaderboardState } from '../../types-ui';
import { resolveStatsCategoryDef } from '../../statsCategories';
import { RANKINGS_TOP_CATEGORY_KEYS } from '../../constants';
import { LIVE_COPY_DE, getLiveMessage } from '../../../../lib/live/copy.de';

function resolveRankingsLiveVariant(state: LeaderboardState): LiveBadgeVariant | null {
  if (state.liveErrorKind === 'rate_limit') return 'rate_limit';
  if (state.liveStatus === 'stale') return 'stale';
  if (state.liveStatus === 'error') return state.loaded ? 'stale' : 'error';
  return null;
}

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
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);

  useEffect(() => {
    if (!activeMetricId || !activeMetricState.loaded) return;
    lastLoadedMetricRef.current = { id: activeMetricId, state: activeMetricState };
  }, [activeMetricId, activeMetricState]);

  useEffect(() => {
    if (!mobilePickerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobilePickerOpen(false);
      }
    };

    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setMobilePickerOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobilePickerOpen]);

  useEffect(() => {
    if (!activeMetricId) return;
    setMobilePickerOpen(false);
  }, [activeMetricId]);

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

  const activeCategory = useMemo(() => {
    if (!metrics || !activeMetricId) return null;
    return resolveStatsCategoryDef(activeMetricId, metrics[activeMetricId]);
  }, [activeMetricId, metrics]);

  const liveBadgeVariant = useMemo(
    () => resolveRankingsLiveVariant(activeMetricState),
    [activeMetricState],
  );

  const activeBoardNotice = useMemo(() => {
    if (!metrics || !activeMetricId) return null;

    if (activeMetricState.loading && !activeMetricState.loaded) {
      return {
        text: LIVE_COPY_DE.table_loading,
        variant: 'neutral' as const,
      };
    }

    if (activeMetricState.liveStatus === 'error') {
      return {
        text:
          getLiveMessage({
            status: 'error',
            errorKind: activeMetricState.liveErrorKind || 'unknown',
          }) || LIVE_COPY_DE.error_generic,
        variant: 'warning' as const,
      };
    }

    if (activeMetricState.liveStatus === 'stale') {
      return {
        text: LIVE_COPY_DE.stale_hint,
        variant: 'neutral' as const,
      };
    }

    const activePage = activeMetricState.pages[activeMetricState.currentPage] || [];
    if (!activeMetricState.loading && activeMetricState.loaded && activePage.length === 0) {
      return {
        text: LIVE_COPY_DE.no_data_available,
        variant: 'neutral' as const,
      };
    }

    return null;
  }, [activeMetricId, activeMetricState, metrics]);

  const quickAccessMetricIds = useMemo(() => {
    if (!metrics) return [];
    return RANKINGS_TOP_CATEGORY_KEYS.filter((id) => Boolean(metrics[id]));
  }, [metrics]);

  const handleSelectMetricFromDrawer = (id: string) => {
    onSelectMetric(id);
    setMobilePickerOpen(false);
  };

  const handleQuickAccessSelect = (id: string) => {
    if (metricFilter.trim().length > 0) {
      onMetricFilterChange('');
    }
    onSelectMetric(id);
  };

  const visibleCategoryCount = groupedMetrics.reduce((sum, group) => sum + group.ids.length, 0);

  return (
    <>
      <StatsLayoutGrid className="[overflow-anchor:none]">
        <StatsLayoutRail className="hidden lg:block" ariaLabel="Ranglisten Kategorien">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
            <button
              type="button"
              onClick={onReset}
              className="mg-btn mg-btn--sm mg-btn--surface group"
            >
              <RotateCcw
                size={15}
                className="text-muted group-hover:text-accent transition-colors"
              />
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

        <StatsLayoutMain className="lg:col-span-8" ariaLabel="Ranglisten Ergebnisse">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SectionTitle
                title="Ranglisten"
                subtitle="Kategorie finden, auswählen und sofort die Top-N sehen."
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobilePickerOpen(true)}
                className="mg-btn mg-btn--sm mg-btn--surface lg:!hidden"
                disabled={!metrics}
                aria-haspopup="dialog"
                aria-expanded={mobilePickerOpen ? 'true' : 'false'}
              >
                <ListFilter size={15} />
                Kategorien
              </button>
              <LiveBadgeSlot variant={liveBadgeVariant} className="shrink-0" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <section aria-label="Schnellzugriff">
              <p className="text-fg/90 text-xs font-semibold tracking-wide uppercase">
                Schnellzugriff
              </p>

              <div className="mt-2 min-h-10">
                {metrics && quickAccessMetricIds.length > 0 ? (
                  <div className="overflow-x-auto pb-1">
                    <ul className="flex w-max items-center gap-2" role="list">
                      {quickAccessMetricIds.map((id) => {
                        const categoryDef = resolveStatsCategoryDef(id, metrics[id]);
                        const isActive = id === activeMetricId;

                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => handleQuickAccessSelect(id)}
                              className={[
                                'mg-pill text-sm font-semibold whitespace-nowrap',
                                isActive
                                  ? 'border-accent/55 bg-accent/18 text-fg hover:bg-accent/30'
                                  : 'border-border/80 bg-surface-solid/35 hover:border-accent/45 hover:bg-accent/14 hover:text-fg',
                              ].join(' ')}
                              aria-pressed={isActive}
                            >
                              {categoryDef.label || id}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div
                    className="bg-surface-solid/35 border-border/70 h-10 rounded-full border"
                    aria-hidden="true"
                  />
                )}
              </div>
            </section>

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
                  Keine Rangliste ausgewählt. Wähle eine Kategorie aus.
                </span>
              </div>
            ) : null}

            {metrics && activeMetricId ? (
              <>
                {activeBoardNotice ? (
                  <div
                    className="mg-notice text-sm"
                    data-variant={activeBoardNotice.variant}
                    role="status"
                  >
                    <span className="text-fg/90">{activeBoardNotice.text}</span>
                  </div>
                ) : null}

                <div>
                  <p className="text-muted text-xs font-semibold">Aktive Kategorie</p>
                  <ul className="mg-list divide-border/75 mt-2 divide-y text-sm">
                    <li className="flex items-center justify-between gap-3 px-1 py-2">
                      <span className="text-muted">Name</span>
                      <span
                        className="text-fg truncate text-right font-semibold"
                        title={activeCategory?.label || activeMetricId}
                      >
                        {activeCategory?.label || activeMetricId}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3 px-1 py-2">
                      <span className="text-muted">Gruppe</span>
                      <span className="text-fg/85 truncate text-right">
                        {activeCategory?.group || '-'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3 px-1 py-2">
                      <span className="text-muted">ID</span>
                      <span className="text-fg/85 truncate text-right">{activeMetricId}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3 px-1 py-2">
                      <span className="text-muted">Einheit</span>
                      <span className="text-fg/85 truncate text-right">
                        {activeCategory?.unit || 'Anzahl'}
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

      {mobilePickerOpen && metrics ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Ranglisten Kategorien"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Kategorien schließen"
            onClick={() => setMobilePickerOpen(false)}
          />

          <section className="bg-surface-solid/96 border-border absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[1rem] border-t shadow-2xl">
            <header className="border-border/80 flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-fg text-sm font-semibold">Kategorie auswählen</p>
                <p className="text-muted text-xs">{visibleCategoryCount} Treffer</p>
              </div>
              <button
                type="button"
                className="focus-visible:ring-offset-bg text-fg hover:text-accent inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label="Kategorien schließen"
                onClick={() => setMobilePickerOpen(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="max-h-[calc(82dvh-4.5rem)] overflow-y-auto px-4 pt-3 pb-4">
              <MetricPicker
                metrics={metrics}
                grouped={groupedMetrics}
                filter={metricFilter}
                onFilterChange={onMetricFilterChange}
                activeMetricId={activeMetricId}
                onSelectMetric={handleSelectMetricFromDrawer}
                surface={false}
                scrollClassName="max-h-none overflow-visible pr-0"
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
