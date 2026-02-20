import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ListFilter, RotateCcw, SearchX, X } from 'lucide-react';

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

const LAST_CATEGORIES_STORAGE_KEY = 'stats:lastCategories:v1';
const LAST_CATEGORIES_LIMIT = 5;
const LAST_CATEGORIES_VISIBLE_LIMIT = 5;
const HORIZONTAL_SCROLL_EPSILON = 2;

function normalizeLastCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const key = entry.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(key);
    if (normalized.length >= LAST_CATEGORIES_LIMIT) break;
  }

  return normalized;
}

function readLastCategories(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LAST_CATEGORIES_STORAGE_KEY);
    if (!raw) return [];
    return normalizeLastCategories(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeLastCategories(next: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      LAST_CATEGORIES_STORAGE_KEY,
      JSON.stringify(next.slice(0, LAST_CATEGORIES_LIMIT)),
    );
  } catch {
    // Unkritisch: localStorage kann blockiert sein.
  }
}

function clearLastCategories(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(LAST_CATEGORIES_STORAGE_KEY);
  } catch {
    // Unkritisch: localStorage kann blockiert sein.
  }
}

function resolveHorizontalScrollState(container: HTMLDivElement | null): {
  canScrollLeft: boolean;
  canScrollRight: boolean;
} {
  if (!container) {
    return { canScrollLeft: false, canScrollRight: false };
  }

  const maxScrollLeft = container.scrollWidth - container.clientWidth;
  if (maxScrollLeft <= HORIZONTAL_SCROLL_EPSILON) {
    return { canScrollLeft: false, canScrollRight: false };
  }

  return {
    canScrollLeft: container.scrollLeft > HORIZONTAL_SCROLL_EPSILON,
    canScrollRight: container.scrollLeft < maxScrollLeft - HORIZONTAL_SCROLL_EPSILON,
  };
}

function scrollHorizontal(container: HTMLDivElement | null, direction: 'left' | 'right'): void {
  if (!container) return;

  const distance = Math.max(180, Math.round(container.clientWidth * 0.75));
  container.scrollBy({
    left: direction === 'left' ? -distance : distance,
    behavior: 'smooth',
  });
}

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
  const [lastCategoryIds, setLastCategoryIds] = useState<string[]>([]);
  const quickAccessScrollRef = useRef<HTMLDivElement | null>(null);
  const recentlyViewedScrollRef = useRef<HTMLDivElement | null>(null);
  const [quickAccessScrollState, setQuickAccessScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [recentlyViewedScrollState, setRecentlyViewedScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    if (!activeMetricId || !activeMetricState.loaded) return;
    lastLoadedMetricRef.current = { id: activeMetricId, state: activeMetricState };
  }, [activeMetricId, activeMetricState]);

  useEffect(() => {
    setLastCategoryIds(readLastCategories());
  }, []);

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

  const recentlyViewedMetricIds = useMemo(() => {
    if (!metrics) return [];
    return lastCategoryIds
      .filter((id) => Boolean(metrics[id]))
      .slice(0, LAST_CATEGORIES_VISIBLE_LIMIT);
  }, [lastCategoryIds, metrics]);

  useEffect(() => {
    const container = quickAccessScrollRef.current;
    const update = () => {
      setQuickAccessScrollState(resolveHorizontalScrollState(container));
    };

    update();
    if (!container) return;

    const rafId = window.requestAnimationFrame(update);
    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [metrics, quickAccessMetricIds.length]);

  useEffect(() => {
    const container = recentlyViewedScrollRef.current;
    const update = () => {
      setRecentlyViewedScrollState(resolveHorizontalScrollState(container));
    };

    update();
    if (!container) return;

    const rafId = window.requestAnimationFrame(update);
    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [metrics, recentlyViewedMetricIds.length]);

  const handleSelectMetric = (id: string) => {
    setLastCategoryIds((previous) => {
      const next = [id, ...previous.filter((entry) => entry !== id)].slice(
        0,
        LAST_CATEGORIES_LIMIT,
      );
      writeLastCategories(next);
      return next;
    });
    onSelectMetric(id);
  };

  const handleSelectMetricFromDrawer = (id: string) => {
    handleSelectMetric(id);
    setMobilePickerOpen(false);
  };

  const handleQuickAccessSelect = (id: string) => {
    if (metricFilter.trim().length > 0) {
      onMetricFilterChange('');
    }
    handleSelectMetric(id);
  };

  const handleClearLastCategories = () => {
    setLastCategoryIds([]);
    clearLastCategories();
  };

  const handleQuickAccessScroll = (direction: 'left' | 'right') => {
    scrollHorizontal(quickAccessScrollRef.current, direction);
  };

  const handleRecentlyViewedScroll = (direction: 'left' | 'right') => {
    scrollHorizontal(recentlyViewedScrollRef.current, direction);
  };

  const showQuickAccessScrollControls =
    quickAccessScrollState.canScrollLeft || quickAccessScrollState.canScrollRight;
  const showRecentlyViewedScrollControls =
    recentlyViewedScrollState.canScrollLeft || recentlyViewedScrollState.canScrollRight;

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
                onSelectMetric={handleSelectMetric}
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
                  <div className="flex items-center gap-2">
                    {showQuickAccessScrollControls ? (
                      <button
                        type="button"
                        onClick={() => handleQuickAccessScroll('left')}
                        className="focus-visible:ring-offset-bg text-muted hover:text-fg disabled:text-muted/35 border-border/70 bg-surface-solid/35 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
                        aria-label="Schnellzugriff nach links scrollen"
                        disabled={!quickAccessScrollState.canScrollLeft}
                      >
                        <ChevronLeft size={13} />
                      </button>
                    ) : null}

                    <div
                      ref={quickAccessScrollRef}
                      className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      <ul className="flex w-max translate-y-[2px] items-center gap-2" role="list">
                        {quickAccessMetricIds.map((id) => {
                          const categoryDef = resolveStatsCategoryDef(id, metrics[id]);
                          const isActive = id === activeMetricId;

                          return (
                            <li key={id}>
                              <button
                                type="button"
                                onClick={() => handleQuickAccessSelect(id)}
                                className={[
                                  'mg-pill h-8 px-3 text-xs leading-none font-semibold whitespace-nowrap',
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

                    {showQuickAccessScrollControls ? (
                      <button
                        type="button"
                        onClick={() => handleQuickAccessScroll('right')}
                        className="focus-visible:ring-offset-bg text-muted hover:text-fg disabled:text-muted/35 border-border/70 bg-surface-solid/35 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
                        aria-label="Schnellzugriff nach rechts scrollen"
                        disabled={!quickAccessScrollState.canScrollRight}
                      >
                        <ChevronRight size={13} />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div
                    className="bg-surface-solid/35 border-border/70 h-10 rounded-full border"
                    aria-hidden="true"
                  />
                )}
              </div>
            </section>

            {metrics && recentlyViewedMetricIds.length > 0 ? (
              <section aria-label="Zuletzt angesehen">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-fg/90 text-xs font-semibold tracking-wide uppercase">
                    Zuletzt angesehen (dieses Ger&auml;t)
                  </p>
                  <button
                    type="button"
                    onClick={handleClearLastCategories}
                    className="focus-visible:ring-offset-bg text-muted hover:text-accent inline-flex items-center rounded-md px-1 py-0.5 text-xs font-semibold underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Zur&uuml;cksetzen
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {showRecentlyViewedScrollControls ? (
                    <button
                      type="button"
                      onClick={() => handleRecentlyViewedScroll('left')}
                      className="focus-visible:ring-offset-bg text-muted hover:text-fg disabled:text-muted/35 border-border/70 bg-surface-solid/35 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
                      aria-label="Zuletzt angesehen nach links scrollen"
                      disabled={!recentlyViewedScrollState.canScrollLeft}
                    >
                      <ChevronLeft size={13} />
                    </button>
                  ) : null}

                  <div
                    ref={recentlyViewedScrollRef}
                    className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <ul className="flex w-max translate-y-[2px] items-center gap-2" role="list">
                      {recentlyViewedMetricIds.map((id) => {
                        const categoryDef = resolveStatsCategoryDef(id, metrics[id]);
                        const isActive = id === activeMetricId;

                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => handleSelectMetric(id)}
                              className={[
                                'mg-pill h-8 px-3 text-xs leading-none font-semibold whitespace-nowrap',
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

                  {showRecentlyViewedScrollControls ? (
                    <button
                      type="button"
                      onClick={() => handleRecentlyViewedScroll('right')}
                      className="focus-visible:ring-offset-bg text-muted hover:text-fg disabled:text-muted/35 border-border/70 bg-surface-solid/35 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
                      aria-label="Zuletzt angesehen nach rechts scrollen"
                      disabled={!recentlyViewedScrollState.canScrollRight}
                    >
                      <ChevronRight size={13} />
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

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
