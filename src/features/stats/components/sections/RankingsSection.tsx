import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ListFilter, RotateCcw, SearchX } from 'lucide-react';

import type { GroupedMetrics } from '../MetricPicker';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { LeaderboardTable } from '../LeaderboardTable';
import { MetricPicker } from '../MetricPicker';
import { LiveBadgeSlot, type LiveBadgeVariant } from '../LiveBadge';
import { SectionTitle } from '../StatsPrimitives';
import { QuickAccessPills } from './QuickAccessPills';
import { RecentPills } from './RecentPills';
import type { MetricDef } from '../../types';
import type { LeaderboardState } from '../../types-ui';
import { resolveStatsCategoryDef } from '../../statsCategories';
import { RANKINGS_TOP_CATEGORY_KEYS } from '../../constants';
import { STATS_OPEN_CATEGORIES_SHEET_EVENT } from '../../ui/events';
import { CategoriesSheet } from '../../ui/sheets/CategoriesSheet';
import { LIVE_COPY_DE, getLiveMessage } from '../../../../lib/live/copy.de';

const LAST_CATEGORIES_STORAGE_KEY = 'stats:lastCategories:v1';
const LAST_CATEGORIES_LIMIT = 5;
const LAST_CATEGORIES_VISIBLE_LIMIT = 5;

type RankingsSectionProps = {
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
};

type BoardNotice = {
  text: string;
  variant: 'neutral' | 'warning';
};

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

function resolveRankingsLiveVariant(state: LeaderboardState): LiveBadgeVariant | null {
  if (state.liveErrorKind === 'rate_limit') return 'rate_limit';
  if (state.liveStatus === 'stale') return 'stale';
  if (state.liveStatus === 'error') return state.loaded ? 'stale' : 'error';
  return null;
}

function resolveActiveBoardNotice({
  metrics,
  activeMetricId,
  activeMetricState,
}: {
  metrics: Record<string, MetricDef> | null;
  activeMetricId: string | null;
  activeMetricState: LeaderboardState;
}): BoardNotice | null {
  if (!metrics || !activeMetricId) return null;

  if (activeMetricState.loading && !activeMetricState.loaded) {
    return {
      text: LIVE_COPY_DE.table_loading,
      variant: 'neutral',
    };
  }

  if (activeMetricState.liveStatus === 'error') {
    return {
      text:
        getLiveMessage({
          status: 'error',
          errorKind: activeMetricState.liveErrorKind || 'unknown',
        }) || LIVE_COPY_DE.error_generic,
      variant: 'warning',
    };
  }

  if (activeMetricState.liveStatus === 'stale') {
    return {
      text: LIVE_COPY_DE.stale_hint,
      variant: 'neutral',
    };
  }

  const activePage = activeMetricState.pages[activeMetricState.currentPage] || [];
  if (!activeMetricState.loading && activeMetricState.loaded && activePage.length === 0) {
    return {
      text: LIVE_COPY_DE.no_data_available,
      variant: 'neutral',
    };
  }

  return null;
}

function RankingsRail({
  metrics,
  groupedMetrics,
  metricFilter,
  activeMetricId,
  onMetricFilterChange,
  onReset,
  onSelectMetric,
}: {
  metrics: Record<string, MetricDef> | null;
  groupedMetrics: GroupedMetrics;
  metricFilter: string;
  activeMetricId: string | null;
  onMetricFilterChange: (next: string) => void;
  onReset: () => void;
  onSelectMetric: (id: string) => void;
}) {
  return (
    <StatsLayoutRail className="hidden lg:block" ariaLabel="Ranglisten Kategorien">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
        <button type="button" onClick={onReset} className="mg-btn mg-btn--sm mg-btn--surface group">
          <RotateCcw size={15} className="text-muted group-hover:text-accent transition-colors" />
          {'Zurücksetzen'}
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
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="mg-notice text-sm" data-variant="neutral">
        {LIVE_COPY_DE.rankings_loading}
      </div>
      <div className="space-y-2" aria-hidden="true">
        <div className="bg-surface-solid/35 border-border/70 h-9 animate-pulse rounded-lg border" />
        <div className="bg-surface-solid/35 border-border/70 h-9 animate-pulse rounded-lg border" />
        <div className="bg-surface-solid/35 border-border/70 h-56 animate-pulse rounded-[var(--radius)] border" />
      </div>
    </div>
  );
}

function NoResultsNotice() {
  return (
    <div className="mg-notice text-sm" data-variant="warning" role="status">
      <span
        className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
        aria-hidden="true"
      >
        <SearchX size={14} />
      </span>
      <span className="text-fg/90">Keine Ranglisten gefunden.</span>
    </div>
  );
}

function NoActiveMetricNotice() {
  return (
    <div className="mg-notice text-sm" data-variant="neutral" role="status">
      <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
      <span className="text-fg/90">
        {'Keine Rangliste ausgewaehlt. Waehle eine Kategorie aus.'}
      </span>
    </div>
  );
}

function ActiveCategoryInfo({
  activeMetricId,
  activeCategory,
}: {
  activeMetricId: string;
  activeCategory: ReturnType<typeof resolveStatsCategoryDef> | null;
}) {
  return (
    <div className="mg-app-panel mg-app-panel--soft p-3">
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
          <span className="text-fg/85 truncate text-right">{activeCategory?.group || '-'}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-1 py-2">
          <span className="text-muted">ID</span>
          <span className="text-fg/85 truncate text-right">{activeMetricId}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-1 py-2">
          <span className="text-muted">Einheit</span>
          <span className="text-fg/85 truncate text-right">{activeCategory?.unit || 'Anzahl'}</span>
        </li>
      </ul>
    </div>
  );
}

function RankingsMainContent({
  metrics,
  hasNoRanklistResults,
  activeMetricId,
  activeBoardNotice,
  activeCategory,
  tableMetricKey,
  tableState,
  activeMetricState,
  pageSize,
  getPlayerName,
  onPlayerClick,
  onGoPage,
  onLoadMore,
  canUseLoadedFallback,
}: {
  metrics: Record<string, MetricDef> | null;
  hasNoRanklistResults: boolean;
  activeMetricId: string | null;
  activeBoardNotice: BoardNotice | null;
  activeCategory: ReturnType<typeof resolveStatsCategoryDef> | null;
  tableMetricKey: string | null;
  tableState: LeaderboardState;
  activeMetricState: LeaderboardState;
  pageSize: number;
  getPlayerName: (uuid: string) => string;
  onPlayerClick: (uuid: string) => void;
  onGoPage: (pageIndex: number) => void;
  onLoadMore: () => void;
  canUseLoadedFallback: boolean;
}) {
  if (!metrics) return <LoadingState />;

  if (hasNoRanklistResults) return <NoResultsNotice />;

  if (!activeMetricId) return <NoActiveMetricNotice />;

  return (
    <>
      {activeBoardNotice ? (
        <div className="mg-notice text-sm" data-variant={activeBoardNotice.variant} role="status">
          <span className="text-fg/90">{activeBoardNotice.text}</span>
        </div>
      ) : null}

      <ActiveCategoryInfo activeMetricId={activeMetricId} activeCategory={activeCategory} />

      <div className="min-w-0">
        <LeaderboardTable
          metricKey={tableMetricKey || activeMetricId}
          def={metrics[activeMetricId]}
          state={tableState}
          loadingOverride={activeMetricState.loading}
          showCenterLoader={activeMetricState.loading && !activeMetricState.loaded}
          centerLoaderLabel={
            canUseLoadedFallback ? LIVE_COPY_DE.table_loading_next : LIVE_COPY_DE.table_loading
          }
          pageSize={pageSize}
          getPlayerName={getPlayerName}
          onPlayerClick={onPlayerClick}
          onGoPage={onGoPage}
          onLoadMore={onLoadMore}
          surface={false}
          showDesktopCopyAction
        />
      </div>
    </>
  );
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
}: RankingsSectionProps) {
  const categoriesSheetId = useId();
  const lastLoadedMetricRef = useRef<{ id: string; state: LeaderboardState } | null>(null);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const [lastCategoryIds, setLastCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!activeMetricId || !activeMetricState.loaded) return;
    lastLoadedMetricRef.current = { id: activeMetricId, state: activeMetricState };
  }, [activeMetricId, activeMetricState]);

  useEffect(() => {
    setLastCategoryIds(readLastCategories());
  }, []);

  useEffect(() => {
    const onOpenCategoriesSheet = () => {
      setMobilePickerOpen(true);
    };

    window.addEventListener(STATS_OPEN_CATEGORIES_SHEET_EVENT, onOpenCategoriesSheet);
    return () => {
      window.removeEventListener(STATS_OPEN_CATEGORIES_SHEET_EVENT, onOpenCategoriesSheet);
    };
  }, []);

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

  const activeBoardNotice = useMemo(
    () =>
      resolveActiveBoardNotice({
        metrics,
        activeMetricId,
        activeMetricState,
      }),
    [activeMetricId, activeMetricState, metrics],
  );

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

  const handleSelectMetric = useCallback(
    (id: string) => {
      setLastCategoryIds((previous) => {
        const next = [id, ...previous.filter((entry) => entry !== id)].slice(
          0,
          LAST_CATEGORIES_LIMIT,
        );
        writeLastCategories(next);
        return next;
      });
      onSelectMetric(id);
    },
    [onSelectMetric],
  );

  const handleQuickAccessSelect = useCallback(
    (id: string) => {
      if (metricFilter.trim().length > 0) {
        onMetricFilterChange('');
      }
      handleSelectMetric(id);
    },
    [handleSelectMetric, metricFilter, onMetricFilterChange],
  );

  const handleCloseMobilePicker = useCallback(() => {
    setMobilePickerOpen(false);
  }, []);

  const handleClearLastCategories = useCallback(() => {
    setLastCategoryIds([]);
    clearLastCategories();
  }, []);

  return (
    <>
      <StatsLayoutGrid className="[overflow-anchor:none]">
        <RankingsRail
          metrics={metrics}
          groupedMetrics={groupedMetrics}
          metricFilter={metricFilter}
          activeMetricId={activeMetricId}
          onMetricFilterChange={onMetricFilterChange}
          onReset={onReset}
          onSelectMetric={handleSelectMetric}
        />

        <StatsLayoutMain className="lg:col-span-8" ariaLabel="Ranglisten Ergebnisse">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SectionTitle
                title="Ranglisten"
                subtitle={'Kategorie finden, auswaehlen und sofort die Top-N sehen.'}
              />
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setMobilePickerOpen(true)}
                className="mg-btn mg-btn--sm mg-btn--surface lg:!hidden"
                disabled={!metrics}
                aria-haspopup="dialog"
                aria-expanded={mobilePickerOpen ? 'true' : 'false'}
                aria-controls={categoriesSheetId}
              >
                <ListFilter size={15} />
                Kategorien
              </button>
              <LiveBadgeSlot variant={liveBadgeVariant} className="shrink-0" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <QuickAccessPills
              metrics={metrics}
              metricIds={quickAccessMetricIds}
              activeMetricId={activeMetricId}
              onSelectMetric={handleQuickAccessSelect}
            />

            {metrics && recentlyViewedMetricIds.length > 0 ? (
              <RecentPills
                metrics={metrics}
                metricIds={recentlyViewedMetricIds}
                activeMetricId={activeMetricId}
                onSelectMetric={handleSelectMetric}
                onReset={handleClearLastCategories}
              />
            ) : null}

            <RankingsMainContent
              metrics={metrics}
              hasNoRanklistResults={hasNoRanklistResults}
              activeMetricId={activeMetricId}
              activeBoardNotice={activeBoardNotice}
              activeCategory={activeCategory}
              tableMetricKey={tableMetricKey}
              tableState={tableState}
              activeMetricState={activeMetricState}
              pageSize={pageSize}
              getPlayerName={getPlayerName}
              onPlayerClick={onPlayerClick}
              onGoPage={onGoPage}
              onLoadMore={onLoadMore}
              canUseLoadedFallback={canUseLoadedFallback}
            />
          </div>
        </StatsLayoutMain>
      </StatsLayoutGrid>

      {metrics ? (
        <CategoriesSheet
          open={mobilePickerOpen}
          sheetId={categoriesSheetId}
          metrics={metrics}
          grouped={groupedMetrics}
          filter={metricFilter}
          onFilterChange={onMetricFilterChange}
          activeMetricId={activeMetricId}
          onSelectMetric={handleSelectMetric}
          onClose={handleCloseMobilePicker}
        />
      ) : null}
    </>
  );
}
