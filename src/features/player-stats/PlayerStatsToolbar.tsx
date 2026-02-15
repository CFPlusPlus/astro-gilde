import type { RefObject } from 'react';
import { Package, Search, Slash, Skull, Sparkles, X } from 'lucide-react';

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
}: {
  activeTab: TabKey;
  setActiveTab: (next: TabKey) => void;
  filterRaw: string;
  setFilterRaw: (next: string) => void;
  filterInputRef: RefObject<HTMLInputElement | null>;
  activeResultCount: number;
  activeTabLabel: string;
}) {
  return (
    <section className="mg-surface-2 p-3 sm:p-4">
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
                      ? 'border-accent/45 bg-accent/10 text-accent'
                      : 'text-fg/85 hover:bg-surface-solid/35 hover:text-fg border-transparent',
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
      </nav>

      <div className="mt-3 space-y-2.5">
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
            className={['mg-search-clear', filterRaw ? '' : 'mg-search-clear--hidden'].join(' ')}
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
    </section>
  );
}
