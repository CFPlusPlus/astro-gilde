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
    <section className="mg-surface-2 p-3 sm:p-4 lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-center">
        <button
          type="button"
          className="group hover:bg-surface-solid/45 focus-visible:ring-offset-bg flex min-h-[6.5rem] w-full items-center gap-4 rounded-[var(--radius)] p-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
          onClick={() => {
            if (!skinFullUrl) return;
            onOpenSkin();
          }}
          aria-label="3D Skin-Viewer öffnen"
        >
          <img
            src={skinHeadUrl}
            alt={playerName || uuidFull || ''}
            className="border-border/70 h-16 w-16 rounded-xl border bg-black/20 object-cover transition-transform group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]"
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
          <span className="min-w-0 flex-1">
            <span className="text-fg block truncate text-base font-semibold">
              {playerName || 'Unbekannter Spieler'}
            </span>
            <span className="text-muted block truncate pt-0.5 text-xs">
              {uuidFull || 'Keine UUID erkannt'}
            </span>
            <span className="text-muted mt-1.5 inline-flex items-center gap-2 text-xs">
              <Info size={14} className="shrink-0" /> Skin-Viewer öffnen
            </span>
          </span>
        </button>

        <div className="space-y-3">
          <nav aria-label="Spielerstatistik Navigation" className="min-w-0">
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" role="list">
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
                        'focus-visible:ring-offset-bg inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
                        isActive
                          ? 'border-border/80 bg-surface-solid/55 text-fg'
                          : 'text-fg/85 hover:bg-surface-solid/35 hover:text-fg border-transparent',
                      ].join(' ')}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={16} className={isActive ? 'text-fg/80' : 'text-muted'} />
                      {it.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-2.5">
            <label className="bg-surface-solid/60 border-border/80 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 transition-colors">
              <Search size={18} className="text-muted" />
              <input
                ref={filterInputRef}
                value={filterRaw}
                onChange={(e) => setFilterRaw(e.target.value)}
                type="search"
                placeholder='Filtern... (z. B. dirt, "zombie", "diamond")'
                className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                className={['mg-search-clear', filterRaw ? '' : 'mg-search-clear--hidden'].join(
                  ' ',
                )}
                onClick={() => setFilterRaw('')}
                aria-label="Filter leeren"
                tabIndex={filterRaw ? 0 : -1}
              >
                <X size={14} />
              </button>
            </label>
            <div className="text-muted flex flex-wrap items-center gap-3 text-xs">
              <span>
                {nf(activeResultCount)} Treffer in {activeTabLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <Slash size={12} /> Suche fokussieren
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
