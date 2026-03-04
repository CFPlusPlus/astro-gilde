import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Info, Map as MapIcon, SearchX, Skull, Swords } from 'lucide-react';

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
  const playerStatsState = usePlayerStatsState();
  const activeTab = playerStatsState.activeTab;
  const setActiveTab = playerStatsState.setActiveTab;
  const filterRaw = playerStatsState.filterRaw;
  const setFilterRaw = playerStatsState.setFilterRaw;
  const filterInputRef = playerStatsState.filterInputRef;
  const filtered = playerStatsState.filtered;
  const sortGeneral = playerStatsState.sortGeneral;
  const setSortGeneral = playerStatsState.setSortGeneral;
  const sortItems = playerStatsState.sortItems;
  const setSortItems = playerStatsState.setSortItems;
  const sortMobs = playerStatsState.sortMobs;
  const setSortMobs = playerStatsState.setSortMobs;
  const isGerman = playerStatsState.isGerman;
  const setIsGerman = playerStatsState.setIsGerman;
  const uuidParam = playerStatsState.uuidParam;
  const uuidFull = playerStatsState.uuidFull;
  const playerName = playerStatsState.playerName;
  const generatedIso = playerStatsState.generatedIso;
  const apiError = playerStatsState.apiError;
  const stats = playerStatsState.stats;
  const uuidCopied = playerStatsState.uuidCopied;
  const setUuidCopied = playerStatsState.setUuidCopied;
  const skinHeadUrl = playerStatsState.skinHeadUrl;
  const skinHeadFallback = playerStatsState.skinHeadFallback;
  const skinFullUrl = playerStatsState.skinFullUrl;
  const skinFullFallback = playerStatsState.skinFullFallback;

  const [skinOpen, setSkinOpen] = useState(false);
  const hasUuidInLocation = uuidParam.trim().length > 0;
  const isLoading = hasUuidInLocation && !apiError && !stats;
  const hasData = Boolean(stats) && !apiError;

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
            {hasData ? (
              <div className="grid min-w-0 grid-cols-1 gap-4">
                <KpiStrip items={kpiItems} variant="inline" />
                <PlayerStatsToolbar
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  filterRaw={filterRaw}
                  setFilterRaw={setFilterRaw}
                  filterInputRef={filterInputRef}
                  activeResultCount={activeResultCount}
                  activeTabLabel={activeTabLabel}
                />
              </div>
            ) : (
              <PlayerStatsToolbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                filterRaw={filterRaw}
                setFilterRaw={setFilterRaw}
                filterInputRef={filterInputRef}
                activeResultCount={activeResultCount}
                activeTabLabel={activeTabLabel}
              />
            )}
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
                <div className="mg-error-message" role="alert">
                  <span className="mg-error-message__icon" aria-hidden="true">
                    <SearchX size={14} />
                  </span>
                  <span>{apiError}</span>
                </div>
              ) : null}

              {hasData ? (
                <>
                  <section className="mg-app-panel mg-app-panel--soft p-3 sm:p-4">
                    <button
                      type="button"
                      className="group hover:bg-surface-solid/45 focus-visible:ring-offset-bg flex min-h-[5.75rem] w-full items-center gap-4 rounded-[var(--radius)] p-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
                      onClick={() => {
                        if (!skinFullUrl) return;
                        setSkinOpen(true);
                      }}
                      aria-label="3D Skin-Viewer öffnen"
                    >
                      <img
                        src={skinHeadUrl}
                        alt={playerName || uuidFull || ''}
                        className="border-border/70 h-16 w-16 rounded-xl border bg-black/20 object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          const img = e.currentTarget;
                          // Nur einmal auf den Fallback wechseln, um Endlosschleifen zu vermeiden.
                          const fallbackAttempted = img.dataset.fallbackAttempted === '1';

                          if (
                            !fallbackAttempted &&
                            skinHeadFallback &&
                            img.src !== skinHeadFallback
                          ) {
                            img.dataset.fallbackAttempted = '1';
                            img.src = skinHeadFallback;
                            return;
                          }

                          img.onerror = null;
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
