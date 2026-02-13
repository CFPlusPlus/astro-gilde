import type { RefObject } from 'react';
import { Info, Package, Search, Slash, Skull, Sparkles, X } from 'lucide-react';

import { nf } from './format';
import type { TabKey } from './table-model';

export function PlayerStatsToolbar({
  activeTab,
  setActiveTab,
  filterRaw,
  setFilterRaw,
  filterInputRef,
  activeResultCount,
  activeTabLabel,
  skinHeadUrl,
  skinHeadFallback,
  skinFullUrl,
  playerName,
  uuidFull,
  onOpenSkin,
}: {
  activeTab: TabKey;
  setActiveTab: (next: TabKey) => void;
  filterRaw: string;
  setFilterRaw: (next: string) => void;
  filterInputRef: RefObject<HTMLInputElement | null>;
  activeResultCount: number;
  activeTabLabel: string;
  skinHeadUrl: string;
  skinHeadFallback: string;
  skinFullUrl: string;
  playerName: string;
  uuidFull: string;
  onOpenSkin: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="group inline-flex items-center gap-3 rounded-xl"
          onClick={() => {
            if (!skinFullUrl) return;
            onOpenSkin();
          }}
          aria-label="3D Skin-Viewer öffnen"
        >
          <img
            src={skinHeadUrl}
            alt={playerName || uuidFull || ''}
            className="border-border/70 h-14 w-14 rounded-xl border bg-black/20 object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              const img = e.currentTarget;
              // Nur einmal auf den Fallback wechseln, um Endlosschleifen zu vermeiden.
              const fallbackAttempted = img.dataset.fallbackAttempted === '1';

              if (!fallbackAttempted && skinHeadFallback && img.src !== skinHeadFallback) {
                img.dataset.fallbackAttempted = '1';
                img.src = skinHeadFallback;
                return;
              }

              img.onerror = null;
            }}
          />
          <span className="text-muted inline-flex items-center gap-2 text-xs">
            <Info size={16} className="shrink-0" /> Skin-Viewer öffnen
          </span>
        </button>
      </div>

      <nav aria-label="Spielerstatistik Navigation">
        <div className="border-border bg-surface/70 md:bg-surface/55 overflow-x-auto rounded-[var(--radius)] border px-3 py-2">
          <ul className="flex w-max items-center gap-1" role="list">
            {(
              [
                { key: 'allgemein', label: 'Allgemein', Icon: Sparkles },
                { key: 'items', label: 'Gegenstände', Icon: Package },
                { key: 'mobs', label: 'Kreaturen', Icon: Skull },
              ] as const
            ).map((it) => {
              const isActive = it.key === activeTab;
              const Icon = it.Icon;
              return (
                <li key={it.key}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(it.key)}
                    className={[
                      'focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-accent/15 border-accent/40 text-fg shadow-sm'
                        : 'text-fg/85 hover:text-fg hover:bg-surface/50 border-transparent',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={16} className={isActive ? 'text-accent' : 'text-muted'} />
                    {it.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="bg-surface/55 border-border flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 transition-colors">
          <Search size={18} className="text-muted" />
          <input
            ref={filterInputRef}
            value={filterRaw}
            onChange={(e) => setFilterRaw(e.target.value)}
            type="search"
            placeholder='Filtern… (z. B. dirt, "zombie", "diamond")'
            className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            className={['mg-search-clear', filterRaw ? '' : 'mg-search-clear--hidden'].join(' ')}
            onClick={() => setFilterRaw('')}
            aria-label="Filter leeren"
            tabIndex={filterRaw ? 0 : -1}
          >
            <X size={14} />
          </button>
        </label>
        <div className="text-muted flex flex-wrap items-center gap-3 text-xs lg:justify-end">
          <span>
            {nf(activeResultCount)} Einträge in {activeTabLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <Slash size={12} /> Suche fokussieren
          </span>
        </div>
      </div>
    </div>
  );
}
