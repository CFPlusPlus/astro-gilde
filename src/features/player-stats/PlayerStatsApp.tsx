import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Info, Map as MapIcon, SearchX, Skull, Swords } from 'lucide-react';

import { nf, nf2 } from './format';
import { PlayerStatsHeader } from './PlayerStatsHeader';
import { PlayerStatsTables } from './PlayerStatsTables';
import { PlayerStatsToolbar } from './PlayerStatsToolbar';
import SkinViewerModal from './SkinViewerModal';
import { usePlayerStatsState, type UsePlayerStatsState } from './usePlayerStatsState';
import { KpiStrip, type KpiItem } from '../stats/components/KpiStrip';
import {
  StatsLayout,
  StatsLayoutGrid,
  StatsLayoutMain,
  StatsLayoutRail,
} from '../stats/layout/StatsLayout';

type ActiveTabSummary = {
  activeResultCount: number;
  activeTabLabel: string;
};

function useFadeOutPlaceholder(): void {
  useEffect(() => {
    const placeholder = document.getElementById('player-stats-placeholder');
    if (!placeholder) return;

    placeholder.classList.add('opacity-0');
    const timeoutId = window.setTimeout(() => {
      placeholder.remove();
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);
}

function useDelayedFlag(value: boolean, delayMs = 350): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!value) {
      setVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return visible;
}

function buildKpiItems(stats: Record<string, unknown> | null): KpiItem[] {
  const asObj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, number>) : null);
  const custom = asObj(stats?.['minecraft:custom']) || {};

  const playTimeHours = (custom['minecraft:play_time'] || 0) / 72000;
  const walkKm = (custom['minecraft:walk_one_cm'] || 0) / 100000;
  const mobKills = custom['minecraft:mob_kills'] || 0;
  const deaths = custom['minecraft:deaths'] || 0;

  return [
    {
      id: 'play_time',
      icon: <Clock3 size={16} />,
      label: 'Spielzeit',
      value: `${nf2(playTimeHours)} h`,
      meta: 'minecraft:play_time',
    },
    {
      id: 'walk',
      icon: <MapIcon size={16} />,
      label: 'Laufdistanz',
      value: `${nf2(walkKm)} km`,
      meta: 'minecraft:walk_one_cm',
    },
    {
      id: 'mob_kills',
      icon: <Swords size={16} />,
      label: 'Mob-Kills',
      value: nf(mobKills),
      meta: 'minecraft:mob_kills',
    },
    {
      id: 'deaths',
      icon: <Skull size={16} />,
      label: 'Tode',
      value: nf(deaths),
      meta: 'minecraft:deaths',
    },
  ];
}

function getActiveTabSummary(
  activeTab: UsePlayerStatsState['activeTab'],
  filtered: UsePlayerStatsState['filtered'],
): ActiveTabSummary {
  if (activeTab === 'allgemein') {
    return { activeResultCount: filtered.general.length, activeTabLabel: 'Allgemein' };
  }

  if (activeTab === 'items') {
    return { activeResultCount: filtered.items.length, activeTabLabel: 'Gegenst\u00e4nde' };
  }

  return { activeResultCount: filtered.mobs.length, activeTabLabel: 'Kreaturen' };
}

function handleSkinHeadImageError(
  event: React.SyntheticEvent<HTMLImageElement>,
  skinHeadFallback: string,
): void {
  const img = event.currentTarget;
  // Nur einmal auf den Fallback wechseln, um Endlosschleifen zu vermeiden.
  const fallbackAttempted = img.dataset.fallbackAttempted === '1';

  if (!fallbackAttempted && skinHeadFallback && img.src !== skinHeadFallback) {
    img.dataset.fallbackAttempted = '1';
    img.src = skinHeadFallback;
    return;
  }

  img.onerror = null;
}

function PlayerSkinQuickAccess({
  skinHeadUrl,
  skinHeadFallback,
  skinFullUrl,
  playerName,
  uuidFull,
  onOpenSkin,
}: {
  skinHeadUrl: string;
  skinHeadFallback: string;
  skinFullUrl: string;
  playerName: string;
  uuidFull: string;
  onOpenSkin: () => void;
}) {
  return (
    <section aria-label="Spielerprofil Schnellzugriff">
      <button
        type="button"
        className="group hover:bg-surface-solid/35 focus-visible:ring-offset-bg flex min-h-[5.75rem] w-full items-center gap-4 rounded-[calc(var(--radius)-3px)] px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
        onClick={() => {
          if (!skinFullUrl) return;
          onOpenSkin();
        }}
        aria-label="3D Skin-Viewer \u00f6ffnen"
      >
        <img
          src={skinHeadUrl}
          alt={playerName || uuidFull || ''}
          className="border-border/70 h-16 w-16 rounded-xl border bg-black/20 object-cover transition-transform group-hover:scale-105"
          onError={(event) => {
            handleSkinHeadImageError(event, skinHeadFallback);
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="text-fg block truncate text-base font-semibold">
            {playerName || 'Unbekannter Spieler'}
          </span>
          <span className="text-muted mt-1 inline-flex items-center gap-2 text-xs">
            <Info size={14} className="shrink-0" /> Skin-Viewer öffnen
          </span>
        </span>
      </button>
    </section>
  );
}

function PlayerStatsSidebar({
  hasData,
  kpiItems,
  skinHeadUrl,
  skinHeadFallback,
  skinFullUrl,
  playerName,
  uuidFull,
  onOpenSkin,
}: {
  hasData: boolean;
  kpiItems: KpiItem[];
  skinHeadUrl: string;
  skinHeadFallback: string;
  skinFullUrl: string;
  playerName: string;
  uuidFull: string;
  onOpenSkin: () => void;
}) {
  if (!hasData) return null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <KpiStrip items={kpiItems} variant="inline" />
      <PlayerSkinQuickAccess
        skinHeadUrl={skinHeadUrl}
        skinHeadFallback={skinHeadFallback}
        skinFullUrl={skinFullUrl}
        playerName={playerName}
        uuidFull={uuidFull}
        onOpenSkin={onOpenSkin}
      />
    </div>
  );
}

function PlayerStatsNotices({
  hasUuidInLocation,
  apiError,
  showLoadingNotice,
}: {
  hasUuidInLocation: boolean;
  apiError: string | null;
  showLoadingNotice: boolean;
}) {
  return (
    <>
      {!hasUuidInLocation && !apiError ? (
        <div className="mg-notice text-sm" data-variant="neutral" role="status">
          <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
          <span className="text-fg/90">
            Keine UUID erkannt. \u00d6ffne einen Spieler \u00fcber die Suche in den Statistiken.
          </span>
        </div>
      ) : null}

      {showLoadingNotice ? (
        <div className="mg-notice text-sm" data-variant="neutral" role="status">
          <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
          <span className="text-fg/90">Spielerstatistiken werden geladen...</span>
        </div>
      ) : null}

      {apiError ? (
        <div className="mg-error-message" role="alert">
          <span className="mg-error-message__icon" aria-hidden="true">
            <SearchX size={14} />
          </span>
          <span>{apiError}</span>
        </div>
      ) : null}
    </>
  );
}

function PlayerStatsLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <section className="mg-app-panel mg-app-panel--soft p-4">
        <div className="animate-pulse space-y-3">
          <div className="bg-surface-solid/55 h-4 w-40 rounded-md" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`kpi-skeleton-${index}`} className="bg-surface-solid/45 h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </section>

      <section className="mg-app-panel mg-app-panel--strong p-4">
        <div className="animate-pulse space-y-3">
          <div className="bg-surface-solid/55 h-4 w-48 rounded-md" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`row-skeleton-${index}`}
              className="bg-surface-solid/40 h-10 rounded-[calc(var(--radius)-3px)]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PlayerStatsResults({
  hasUuidInLocation,
  apiError,
  isLoading,
  showLoadingNotice,
  hasData,
  activeTab,
  setActiveTab,
  filterRaw,
  setFilterRaw,
  filterInputRef,
  activeResultCount,
  activeTabLabel,
  filtered,
  sortGeneral,
  setSortGeneral,
  sortItems,
  setSortItems,
  sortMobs,
  setSortMobs,
}: {
  hasUuidInLocation: boolean;
  apiError: string | null;
  isLoading: boolean;
  showLoadingNotice: boolean;
  hasData: boolean;
  activeTab: UsePlayerStatsState['activeTab'];
  setActiveTab: UsePlayerStatsState['setActiveTab'];
  filterRaw: string;
  setFilterRaw: UsePlayerStatsState['setFilterRaw'];
  filterInputRef: UsePlayerStatsState['filterInputRef'];
  activeResultCount: number;
  activeTabLabel: string;
  filtered: UsePlayerStatsState['filtered'];
  sortGeneral: UsePlayerStatsState['sortGeneral'];
  setSortGeneral: UsePlayerStatsState['setSortGeneral'];
  sortItems: UsePlayerStatsState['sortItems'];
  setSortItems: UsePlayerStatsState['setSortItems'];
  sortMobs: UsePlayerStatsState['sortMobs'];
  setSortMobs: UsePlayerStatsState['setSortMobs'];
}) {
  return (
    <div className="space-y-5" aria-busy={isLoading}>
      <PlayerStatsNotices
        hasUuidInLocation={hasUuidInLocation}
        apiError={apiError}
        showLoadingNotice={showLoadingNotice}
      />

      {isLoading ? <PlayerStatsLoadingSkeleton /> : null}

      {hasData ? (
        <>
          <PlayerStatsToolbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filterRaw={filterRaw}
            setFilterRaw={setFilterRaw}
            filterInputRef={filterInputRef}
            activeResultCount={activeResultCount}
            activeTabLabel={activeTabLabel}
            surface="flat"
            className="border-border/70 border-b pb-4"
          />

          <PlayerStatsTables
            activeTab={activeTab}
            filtered={filtered}
            sortGeneral={sortGeneral}
            setSortGeneral={setSortGeneral}
            sortItems={sortItems}
            setSortItems={setSortItems}
            sortMobs={sortMobs}
            setSortMobs={setSortMobs}
          />
        </>
      ) : null}
    </div>
  );
}

export default function PlayerStatsApp() {
  const [isReady, setIsReady] = useState(false);
  const [skinOpen, setSkinOpen] = useState(false);
  const {
    activeTab,
    setActiveTab,
    filterRaw,
    setFilterRaw,
    filterInputRef,
    filtered,
    sortGeneral,
    setSortGeneral,
    sortItems,
    setSortItems,
    sortMobs,
    setSortMobs,
    isGerman,
    setIsGerman,
    uuidParam,
    uuidFull,
    playerName,
    generatedIso,
    apiError,
    stats,
    uuidCopied,
    setUuidCopied,
    skinHeadUrl,
    skinHeadFallback,
    skinFullUrl,
    skinFullFallback,
  } = usePlayerStatsState();

  const hasUuidInLocation = uuidParam.trim().length > 0;
  const isLoading = hasUuidInLocation && !apiError && !stats;
  const showLoadingNotice = useDelayedFlag(isLoading);
  const hasData = Boolean(stats) && !apiError;

  useFadeOutPlaceholder();

  useEffect(() => {
    setIsReady(true);
  }, []);

  const kpiItems = useMemo(() => buildKpiItems(stats), [stats]);
  const { activeResultCount, activeTabLabel } = useMemo(
    () => getActiveTabSummary(activeTab, filtered),
    [activeTab, filtered],
  );

  const handleCopyUuid = (): void => {
    if (!uuidFull) return;

    void navigator.clipboard
      .writeText(uuidFull)
      .then(() => {
        setUuidCopied(true);
        window.setTimeout(() => setUuidCopied(false), 1200);
      })
      .catch(() => {
        // Clipboard kann blockiert sein (z. B. ohne User-Geste).
      });
  };

  const wideContainerClass = 'mx-auto w-full max-w-[118rem] px-4 sm:px-6 xl:px-8';

  return (
    <div data-player-stats-app-ready={isReady ? 'true' : 'false'}>
      <StatsLayout
        topBarClassName={wideContainerClass}
        contentClassName={wideContainerClass}
        topBar={
          <PlayerStatsHeader
            playerName={playerName}
            isGerman={isGerman}
            onToggleGerman={() => setIsGerman((v) => !v)}
            uuidFull={uuidFull}
            uuidCopied={uuidCopied}
            onCopyUuid={handleCopyUuid}
            generatedIso={generatedIso}
          />
        }
      >
        <StatsLayoutGrid className="[overflow-anchor:none]">
          <StatsLayoutRail ariaLabel="Spielerstatistik Steuerung" className="p-0 lg:col-span-12">
            <PlayerStatsSidebar
              hasData={hasData}
              kpiItems={kpiItems}
              skinHeadUrl={skinHeadUrl}
              skinHeadFallback={skinHeadFallback}
              skinFullUrl={skinFullUrl}
              playerName={playerName}
              uuidFull={uuidFull}
              onOpenSkin={() => setSkinOpen(true)}
            />
          </StatsLayoutRail>

          <StatsLayoutMain ariaLabel="Spielerstatistik Ergebnisse" className="p-0 lg:col-span-12">
            <PlayerStatsResults
              hasUuidInLocation={hasUuidInLocation}
              apiError={apiError}
              isLoading={isLoading}
              showLoadingNotice={showLoadingNotice}
              hasData={hasData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              filterRaw={filterRaw}
              setFilterRaw={setFilterRaw}
              filterInputRef={filterInputRef}
              activeResultCount={activeResultCount}
              activeTabLabel={activeTabLabel}
              filtered={filtered}
              sortGeneral={sortGeneral}
              setSortGeneral={setSortGeneral}
              sortItems={sortItems}
              setSortItems={setSortItems}
              sortMobs={sortMobs}
              setSortMobs={setSortMobs}
            />
          </StatsLayoutMain>
        </StatsLayoutGrid>
      </StatsLayout>

      <SkinViewerModal
        open={skinOpen}
        onClose={() => setSkinOpen(false)}
        skinUrl={skinFullUrl}
        skinFallbackUrls={skinFullFallback ? [skinFullFallback] : undefined}
        playerUuid={uuidFull}
        playerName={playerName}
      />
    </div>
  );
}
