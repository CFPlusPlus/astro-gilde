import React from 'react';
import { Filter, X } from 'lucide-react';
import type { MetricDef } from '../types';
import { resolveStatsCategoryDef } from '../statsCategories';
import { MetricCategoryOption } from './MetricCategoryOption';

export type GroupedMetrics = Array<{ cat: string; ids: string[] }>;

function MetricPickerImpl({
  metrics,
  grouped,
  filter,
  onFilterChange,
  activeMetricId,
  onSelectMetric,
  surface = true,
  scrollClassName,
}: {
  metrics: Record<string, MetricDef>;
  grouped: GroupedMetrics;
  filter: string;
  onFilterChange: (next: string) => void;
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
  surface?: boolean;
  scrollClassName?: string;
}) {
  const visibleCount = grouped.reduce((sum, group) => sum + group.ids.length, 0);
  const activeCategory = activeMetricId
    ? resolveStatsCategoryDef(activeMetricId, metrics[activeMetricId])
    : null;

  return (
    <section className={surface ? 'mg-app-panel p-4' : undefined}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
        <span className="text-muted text-xs">{visibleCount} Treffer</span>
      </div>

      {activeMetricId ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-muted text-xs">Ausgewählt:</span>
          <span className="mg-app-chip mg-app-chip--accent inline-flex max-w-full items-center gap-2 px-3 py-1 text-xs font-semibold">
            <span className="truncate">{activeCategory?.label || activeMetricId}</span>
            {activeCategory?.group ? (
              <span className="text-muted border-border/70 border-l pl-2">
                {activeCategory.group}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="mg-app-field mt-3 flex items-center gap-2 px-3 py-2">
        <Filter size={16} className="text-muted" />
        <input
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          type="search"
          placeholder="Kategorie suchen..."
          className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
          aria-label="Ranglisten Kategorie suchen"
        />
        <button
          type="button"
          onClick={() => onFilterChange('')}
          className={[
            'mg-search-clear',
            filter.trim().length > 0 ? '' : 'mg-search-clear--hidden',
          ].join(' ')}
          aria-label="Ranglisten-Filter zurücksetzen"
          title="Filter zurücksetzen"
          tabIndex={filter.trim().length > 0 ? 0 : -1}
        >
          <X size={14} />
        </button>
      </div>

      <div
        className={[
          'mt-4 [overflow-anchor:none]',
          scrollClassName || 'mg-scrollbar max-h-[520px] overflow-auto pr-1',
        ].join(' ')}
      >
        <div className="space-y-5">
          {grouped.map(({ cat, ids }) => {
            const isCategoryActive = !!activeMetricId && ids.includes(activeMetricId);

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p
                    className={[
                      'text-xs font-semibold tracking-wide uppercase transition-colors',
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
                    {ids.length}
                  </span>
                </div>

                <ul className="mg-list divide-border/75 divide-y" role="list">
                  {ids.map((id) => {
                    const def = metrics[id];
                    const categoryDef = resolveStatsCategoryDef(id, def);
                    const isActive = id === activeMetricId;
                    return (
                      <li key={id}>
                        <MetricCategoryOption
                          id={id}
                          label={categoryDef.label || id}
                          unit={categoryDef.unit}
                          isActive={isActive}
                          onSelect={() => onSelectMetric(id)}
                          activeClassName="mg-metric-option--active"
                          inactiveClassName="mg-metric-option--inactive"
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const MetricPicker = React.memo(MetricPickerImpl);
