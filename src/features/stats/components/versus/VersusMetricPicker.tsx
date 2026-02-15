import { Check, Filter, SearchX, X } from 'lucide-react';

import { getQuickVersusSelection } from '../../versus';
import type { VersusSectionProps } from './types';

type VersusMetricPickerProps = Pick<
  VersusSectionProps,
  | 'maxMetrics'
  | 'versusMetricFilter'
  | 'versusMetricIds'
  | 'versusCatalog'
  | 'versusFilteredCatalog'
  | 'versusGroupedMetrics'
  | 'hasNoVersusResults'
  | 'hasVersusData'
  | 'onVersusMetricFilterChange'
  | 'onApplyVersusSelection'
  | 'onToggleVersusMetric'
>;

export function VersusMetricPicker({
  maxMetrics,
  versusMetricFilter,
  versusMetricIds,
  versusCatalog,
  versusFilteredCatalog,
  versusGroupedMetrics,
  hasNoVersusResults,
  hasVersusData,
  onVersusMetricFilterChange,
  onApplyVersusSelection,
  onToggleVersusMetric,
}: VersusMetricPickerProps) {
  if (!hasVersusData) {
    return (
      <div className="mg-surface-2 text-muted min-w-0 p-5 text-sm">
        Klicke auf "Vergleichen", um die Spielerstatistiken zu laden.
      </div>
    );
  }

  const selectedMetricIds = new Set(versusMetricIds);

  return (
    <div className="mg-surface-2 min-w-0 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
        <span className="text-muted text-xs">{versusCatalog.length} Eintr&auml;ge</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onApplyVersusSelection(getQuickVersusSelection(versusCatalog))}
          className="mg-btn mg-btn--xs mg-btn--secondary"
        >
          Schnellwahl
        </button>
        <button
          type="button"
          onClick={() => onApplyVersusSelection(versusFilteredCatalog.map((entry) => entry.id))}
          className="mg-btn mg-btn--xs mg-btn--secondary"
        >
          Alle
        </button>
        <button
          type="button"
          onClick={() => onApplyVersusSelection([])}
          className="mg-btn mg-btn--xs mg-btn--secondary"
        >
          Keine
        </button>
        <span className="text-muted text-xs">
          {versusMetricIds.length}/{maxMetrics} ausgew&auml;hlt
        </span>
      </div>

      <div className="bg-surface-solid/30 border-border mt-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
        <Filter size={16} className="text-muted" />
        <input
          value={versusMetricFilter}
          onChange={(event) => onVersusMetricFilterChange(event.target.value)}
          type="search"
          placeholder="Filtern..."
          className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
          aria-label="Versus Kategorien filtern"
        />
        <button
          type="button"
          onClick={() => onVersusMetricFilterChange('')}
          className={[
            'mg-search-clear',
            versusMetricFilter.trim().length > 0 ? '' : 'mg-search-clear--hidden',
          ].join(' ')}
          aria-label="Versus-Kategorien-Filter zur&uuml;cksetzen"
          title="Filter zur&uuml;cksetzen"
          tabIndex={versusMetricFilter.trim().length > 0 ? 0 : -1}
        >
          <X size={14} />
        </button>
      </div>

      {hasNoVersusResults ? (
        <div className="mg-notice" data-variant="warning" role="status">
          <span
            className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
            aria-hidden="true"
          >
            <SearchX size={14} />
          </span>
          <span className="text-fg/90">Keine Kategorien gefunden.</span>
        </div>
      ) : null}

      <div className="mg-scrollbar-thin mt-4 max-h-[520px] overflow-auto pr-1">
        <div className="space-y-5">
          {versusGroupedMetrics.map(({ cat, items }) => {
            const isCategoryActive = items.some((entry) => selectedMetricIds.has(entry.id));

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p
                    className={[
                      'min-w-0 text-xs font-semibold tracking-wide break-words uppercase transition-colors',
                      isCategoryActive ? 'text-accent/90' : 'text-muted',
                    ].join(' ')}
                  >
                    {cat}
                  </p>
                  <span
                    className={[
                      'text-xs transition-colors',
                      isCategoryActive ? 'text-accent/80' : 'text-muted',
                    ].join(' ')}
                  >
                    {items.length}
                  </span>
                </div>

                <ul className="space-y-1" role="list">
                  {items.map((entry) => {
                    const isActive = selectedMetricIds.has(entry.id);
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => onToggleVersusMetric(entry.id)}
                          className="mg-metric-option w-full rounded-lg px-3 py-2 text-left text-sm font-semibold"
                          data-active={isActive ? 'true' : 'false'}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="min-w-0 break-words">{entry.label}</span>
                            <span className="flex items-center gap-2">
                              {entry.unit ? (
                                <span className="text-muted mt-0.5 text-xs font-semibold whitespace-nowrap">
                                  {entry.unit}
                                </span>
                              ) : null}
                              {isActive ? <Check size={16} className="text-accent" /> : null}
                            </span>
                          </div>
                          <p className="text-muted mt-1 text-xs break-all">ID: {entry.id}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
