import React from 'react';
import { Check, Filter, X } from 'lucide-react';
import type { MetricDef } from '../types';

export type GroupedMetrics = Array<{ cat: string; ids: string[] }>;

export function MetricPicker({
  metrics,
  grouped,
  filter,
  onFilterChange,
  activeMetricId,
  onSelectMetric,
}: {
  metrics: Record<string, MetricDef>;
  grouped: GroupedMetrics;
  filter: string;
  onFilterChange: (next: string) => void;
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
}) {
  return (
    <div className="mg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
        <span className="text-muted text-xs">{Object.keys(metrics).length} Einträge</span>
      </div>

      <div className="bg-surface-solid/30 border-border mt-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
        <Filter size={16} className="text-muted" />
        <input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          type="search"
          placeholder="Filtern…"
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
          aria-label="Ranglisten-Filter zurücksetzen"
          title="Filter zurücksetzen"
          tabIndex={filter.trim().length > 0 ? 0 : -1}
        >
          <X size={14} />
        </button>
      </div>

      <div className="mg-scrollbar-thin mt-4 max-h-[520px] overflow-auto pr-1">
        <div className="space-y-5">
          {grouped.map(({ cat, ids }) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">{cat}</p>
                <span className="text-muted text-xs">{ids.length}</span>
              </div>

              <ul className="space-y-1" role="list">
                {ids.map((id) => {
                  const def = metrics[id];
                  const isActive = id === activeMetricId;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onSelectMetric(id)}
                        className={[
                          'border-border/60 hover:bg-surface-solid/45 text-fg/90 w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                          isActive ? 'bg-surface-solid/55 border-accent/50' : 'bg-surface-solid/30',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 truncate">{def?.label || id}</span>
                          <span className="flex items-center gap-2">
                            {def?.unit ? (
                              <span className="text-muted mt-0.5 text-xs font-semibold whitespace-nowrap">
                                {def.unit}
                              </span>
                            ) : null}
                            {isActive ? <Check size={16} className="text-accent" /> : null}
                          </span>
                        </div>
                        <p className="text-muted mt-1 text-xs break-all">ID: {id}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
