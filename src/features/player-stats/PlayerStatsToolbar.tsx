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

      <div className="bg-surface-solid/30 rounded-[var(--radius)] px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-[color:var(--ring)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)_auto] lg:items-center">
          <nav aria-label="Spielerstatistik Navigation" className="min-w-0 overflow-x-auto">
            <ul className="flex w-max items-center gap-1.5" role="list">
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
                        'focus-visible:ring-offset-bg relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
                        isActive
                          ? 'bg-accent/16 text-fg'
                          : 'text-fg/85 hover:text-fg hover:bg-surface-solid/45',
                      ].join(' ')}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={16} className={isActive ? 'text-accent' : 'text-muted'} />
                      {it.label}
                      <span
                        aria-hidden="true"
                        className={[
                          'pointer-events-none absolute right-3 bottom-1 left-3 h-0.5 rounded-full transition-opacity',
                          isActive ? 'bg-accent opacity-100' : 'opacity-0',
                        ].join(' ')}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <label className="bg-surface-solid/42 flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 transition-colors">
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
    </div>
  );
}
