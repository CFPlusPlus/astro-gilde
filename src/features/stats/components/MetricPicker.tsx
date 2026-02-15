import React from 'react';
import { Filter, X } from 'lucide-react';
import type { MetricDef } from '../types';

export type GroupedMetrics = Array<{ cat: string; ids: string[] }>;

function MetricPickerImpl({
  metrics,
  grouped,
  filter,
  onFilterChange,
  activeMetricId,
  onSelectMetric,
  surface = true,
}: {
  metrics: Record<string, MetricDef>;
  grouped: GroupedMetrics;
  filter: string;
  onFilterChange: (next: string) => void;
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
  surface?: boolean;
}) {
  const visibleCount = grouped.reduce((sum, group) => sum + group.ids.length, 0);
  const activeMetric = activeMetricId ? metrics[activeMetricId] : null;

  return (
    <section className={surface ? 'mg-surface-2 p-4' : undefined}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
        <span className="text-muted text-xs">{visibleCount} Treffer</span>
      </div>

      {activeMetricId ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-muted text-xs">Ausgewählt:</span>
          <span className="border-border/80 bg-accent/14 text-fg inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
            <span className="truncate">{activeMetric?.label || activeMetricId}</span>
            {activeMetric?.category ? (
              <span className="text-muted border-border/70 border-l pl-2">
                {activeMetric.category}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="bg-surface-solid/55 border-border/80 mt-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
        <Filter size={16} className="text-muted" />
        <input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          type="search"
          placeholder={'Filtern\u2026'}
          className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
          aria-label="Ranglisten filtern"
        />
        <button
          type="button"
          onClick={() => onFilterChange('')}
          className={[
            'mg-search-clear',
            filter.trim().length > 0 ? '' : 'mg-search-clear--hidden',
          ].join(' ')}
          aria-label={'Ranglisten-Filter zur\u00fccksetzen'}
          title={'Filter zur\u00fccksetzen'}
          tabIndex={filter.trim().length > 0 ? 0 : -1}
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-4 max-h-[520px] overflow-auto pr-1 [overflow-anchor:none]">
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
                    const isActive = id === activeMetricId;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => onSelectMetric(id)}
                          className={[
                            'group relative w-full px-2.5 py-2.5 text-left text-sm font-semibold transition-colors sm:px-4 sm:py-3',
                            'focus-visible:ring-offset-bg focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none',
                            isActive
                              ? 'bg-surface-solid/45 text-fg'
                              : 'text-fg/90 hover:bg-surface-solid/35 focus-visible:bg-surface-solid/35',
                          ].join(' ')}
                          data-active={isActive ? 'true' : 'false'}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={[
                                'mt-0.5 h-4 w-1 flex-none rounded-full transition-colors',
                                isActive ? 'bg-accent' : 'group-hover:bg-accent/35 bg-transparent',
                              ].join(' ')}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="min-w-0 flex-1 truncate">{def?.label || id}</span>
                                {def?.unit ? (
                                  <span className="text-muted mt-0.5 text-xs font-semibold whitespace-nowrap">
                                    {def.unit}
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-muted mt-1 block text-xs break-all">
                                ID: {id}
                              </span>
                            </span>
                          </div>
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
    </section>
  );
}

export const MetricPicker = React.memo(MetricPickerImpl);
