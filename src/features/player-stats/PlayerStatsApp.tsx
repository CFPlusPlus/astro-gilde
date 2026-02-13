import React, { useMemo, useState } from 'react';
import { Clock3, Map as MapIcon, Skull, Swords } from 'lucide-react';

import { nf, nf2 } from './format';
import { PlayerStatsHeader } from './PlayerStatsHeader';
import { PlayerStatsTables } from './PlayerStatsTables';
import { PlayerStatsToolbar } from './PlayerStatsToolbar';
import SkinViewerModal from './SkinViewerModal';
import { usePlayerStatsState } from './usePlayerStatsState';
import { KpiStrip, type KpiItem } from '../stats/components/KpiStrip';

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
    canRender,
    uuidCopied,
    setUuidCopied,
    skinHeadUrl,
    skinHeadFallback,
    skinFullUrl,
    skinFullFallback,
  } = usePlayerStatsState();

  const [skinOpen, setSkinOpen] = useState(false);
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

  return (
    <div>
      <PlayerStatsHeader
        playerName={playerName}
        canRender={canRender}
        isGerman={isGerman}
        onToggleGerman={() => setIsGerman((v) => !v)}
        uuidFull={uuidFull}
        uuidCopied={uuidCopied}
        onCopyUuid={handleCopyUuid}
        generatedIso={generatedIso}
        apiError={apiError}
      />

      <section className="mg-container pb-12">
        <div className="space-y-6">
          <KpiStrip items={kpiItems} variant="inline" />

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
        </div>
      </section>

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
