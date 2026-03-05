import { ChevronDown, Filter, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { GroupedMetrics } from '../../components/MetricPicker';
import { MetricCategoryOption } from '../../components/MetricCategoryOption';
import type { MetricDef } from '../../types';
import { resolveStatsCategoryDef } from '../../statsCategories';
import { useSheetDialog } from './useSheetDialog';

const CATEGORIES_SHEET_SCROLL_LOCK_ID = 'stats-categories-sheet';

function deriveExpandedGroups({
  grouped,
  activeMetricId,
  filter,
  previous,
}: {
  grouped: GroupedMetrics;
  activeMetricId: string | null;
  filter: string;
  previous: string[];
}): string[] {
  if (grouped.length === 0) return [];

  if (filter.trim().length > 0) {
    return grouped.map((group) => group.cat);
  }

  const available = new Set(grouped.map((group) => group.cat));
  const kept = previous.filter((cat) => available.has(cat));
  if (kept.length > 0) return kept;

  if (activeMetricId) {
    const activeGroup = grouped.find((group) => group.ids.includes(activeMetricId));
    if (activeGroup) return [activeGroup.cat];
  }

  return [grouped[0].cat];
}

export function CategoriesSheet({
  open,
  sheetId,
  metrics,
  grouped,
  filter,
  onFilterChange,
  activeMetricId,
  onSelectMetric,
  onClose,
}: {
  open: boolean;
  sheetId: string;
  metrics: Record<string, MetricDef>;
  grouped: GroupedMetrics;
  filter: string;
  onFilterChange: (next: string) => void;
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const visibleCount = useMemo(
    () => grouped.reduce((sum, group) => sum + group.ids.length, 0),
    [grouped],
  );

  useEffect(() => {
    if (!open) return;

    setExpandedGroups((previous) =>
      deriveExpandedGroups({
        grouped,
        activeMetricId,
        filter,
        previous,
      }),
    );
  }, [open, grouped, activeMetricId, filter]);

  useSheetDialog({
    open,
    onClose,
    dialogRef,
    scrollLockId: CATEGORIES_SHEET_SCROLL_LOCK_ID,
    closeAtDesktopMinWidthPx: 1024,
  });

  if (!open) return null;

  return (
    <div
      id={sheetId}
      className="fixed inset-0 z-[180] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="mg-overlay-scrim absolute inset-0"
        aria-label={'Kategorien schlie\u00dfen'}
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        tabIndex={-1}
        className="mg-app-sheet absolute inset-0 flex flex-col overflow-hidden border-t shadow-2xl"
      >
        <header className="border-border/80 flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p id={titleId} className="text-fg text-sm font-semibold">
              Kategorien
            </p>
            <p id={descriptionId} className="text-muted text-xs">
              {visibleCount} Treffer
            </p>
          </div>
          <button
            type="button"
            className="focus-visible:ring-offset-bg text-fg hover:text-accent inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label={'Kategorien schlie\u00dfen'}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="border-border/78 shrink-0 border-b px-4 py-3">
          <div className="mg-app-field flex items-center gap-2 px-3 py-2">
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
              aria-label="Ranglisten-Filter zur\u00fccksetzen"
              title="Filter zur\u00fccksetzen"
              tabIndex={filter.trim().length > 0 ? 0 : -1}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="mg-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="space-y-3 pt-3">
            {grouped.length === 0 ? (
              <div className="mg-notice text-sm" data-variant="warning" role="status">
                <span className="text-fg/90">Keine Kategorien gefunden.</span>
              </div>
            ) : (
              grouped.map(({ cat, ids }) => {
                const isExpanded = expandedGroups.includes(cat);
                const isGroupActive = !!activeMetricId && ids.includes(activeMetricId);

                return (
                  <section key={cat} className="mg-app-panel mg-app-panel--soft overflow-hidden">
                    <button
                      type="button"
                      className="focus-visible:ring-offset-bg hover:bg-surface-solid/36 flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
                      aria-expanded={isExpanded ? 'true' : 'false'}
                      onClick={() => {
                        setExpandedGroups((previous) =>
                          previous.includes(cat)
                            ? previous.filter((entry) => entry !== cat)
                            : [...previous, cat],
                        );
                      }}
                    >
                      <span
                        className={[
                          'text-xs font-semibold tracking-wide uppercase',
                          isGroupActive ? 'text-accent' : 'text-fg/90',
                        ].join(' ')}
                      >
                        {cat}
                      </span>
                      <span className="ml-auto flex items-center gap-2">
                        <span className="text-muted text-xs">{ids.length}</span>
                        <ChevronDown
                          size={15}
                          className={[
                            'text-muted transition-transform',
                            isExpanded ? 'rotate-180' : '',
                          ].join(' ')}
                          aria-hidden="true"
                        />
                      </span>
                    </button>

                    {isExpanded ? (
                      <ul
                        className="mg-list divide-border/75 border-border/75 divide-y border-t"
                        role="list"
                      >
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
                                size="compact"
                                onSelect={() => {
                                  onSelectMetric(id);
                                  onClose();
                                }}
                                activeClassName="mg-metric-option--active"
                                inactiveClassName="mg-metric-option--inactive"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </section>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
