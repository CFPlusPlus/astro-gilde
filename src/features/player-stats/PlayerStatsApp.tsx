import React, { useMemo, useState } from 'react';
import { Clock3, Map as MapIcon, SearchX, Skull, Swords } from 'lucide-react';

import { nf, nf2 } from './format';
import { PlayerStatsHeader } from './PlayerStatsHeader';
import { PlayerStatsTables } from './PlayerStatsTables';
import { PlayerStatsToolbar } from './PlayerStatsToolbar';
import SkinViewerModal from './SkinViewerModal';
import { usePlayerStatsState } from './usePlayerStatsState';
import { KpiStrip, type KpiItem } from '../stats/components/KpiStrip';
import {
  StatsLayout,
  StatsLayoutGrid,
  StatsLayoutMain,
  StatsLayoutRail,
} from '../stats/layout/StatsLayout';

export default function PlayerStatsApp() {
  const {
    activeTab,
    setActiveTab,
    isGerman,
    setIsGerman,
    uuidFull,
    playerName,
    generatedIso,
    apiError,
    filterRaw,
    setFilterRaw,
    filterInputRef,
    sortGeneral,
    setSortGeneral,
    sortItems,
    setSortItems,
    sortMobs,
    setSortMobs,
    filtered,
    stats,
    uuidCopied,
    setUuidCopied,
    skinHeadUrl,
    skinHeadFallback,
    skinFullUrl,
    skinFullFallback,
  } = usePlayerStatsState();

  const [skinOpen, setSkinOpen] = useState(false);
  const hasUuidInLocation = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const uuid = new URLSearchParams(window.location.search).get('uuid') || '';
    return uuid.trim().length > 0;
  }, []);
  const isLoading = hasUuidInLocation && !apiError && !stats;
  const hasData = Boolean(stats) && !apiError;

  const kpiItems = useMemo<KpiItem[]>(() => {
    const asObj = (v: unknown) =>
      v && typeof v === 'object' ? (v as Record<string, number>) : null;
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
  }, [stats]);

  const activeResultCount =
    activeTab === 'allgemein'
      ? filtered.general.length
      : activeTab === 'items'
        ? filtered.items.length
        : filtered.mobs.length;
  const activeTabLabel =
    activeTab === 'allgemein' ? 'Allgemein' : activeTab === 'items' ? 'Gegenstände' : 'Kreaturen';

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
    <>
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
            <PlayerStatsToolbar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              filterRaw={filterRaw}
              setFilterRaw={setFilterRaw}
              filterInputRef={filterInputRef}
              activeResultCount={activeResultCount}
              activeTabLabel={activeTabLabel}
              skinHeadUrl={skinHeadUrl}
              skinHeadFallback={skinHeadFallback}
              skinFullUrl={skinFullUrl}
              playerName={playerName}
              uuidFull={uuidFull}
              onOpenSkin={() => setSkinOpen(true)}
            />
          </StatsLayoutRail>

          <StatsLayoutMain ariaLabel="Spielerstatistik Ergebnisse" className="p-0 lg:col-span-12">
            <div className="space-y-5">
              {!hasUuidInLocation && !apiError ? (
                <div className="mg-notice text-sm" data-variant="neutral" role="status">
                  <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
                  <span className="text-fg/90">
                    Keine UUID erkannt. Öffne einen Spieler über die Suche in den Statistiken.
                  </span>
                </div>
              ) : null}

              {isLoading ? (
                <div className="mg-notice text-sm" data-variant="neutral" role="status">
                  <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
                  <span className="text-fg/90">Spielerstatistiken werden geladen...</span>
                </div>
              ) : null}

              {apiError ? (
                <div className="mg-notice text-sm" data-variant="warning" role="alert">
                  <span
                    className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
                    aria-hidden="true"
                  >
                    <SearchX size={14} />
                  </span>
                  <span className="text-fg/90">{apiError}</span>
                </div>
              ) : null}

              {hasData ? (
                <>
                  <KpiStrip items={kpiItems} variant="inline" />

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
    </>
  );
}
