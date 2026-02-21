import { ChevronDown, Filter, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { GroupedMetrics } from '../../components/MetricPicker';
import type { MetricDef } from '../../types';
import { resolveStatsCategoryDef } from '../../statsCategories';
import { lockPageScroll, unlockPageScroll } from '../../../../scripts/app/scroll-lock';

const CATEGORIES_SHEET_SCROLL_LOCK_ID = 'stats-categories-sheet';

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];

  const selector =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.hasAttribute('disabled')) return false;
    return true;
  });
}

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
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
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

  useEffect(() => {
    if (!open) return;

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockPageScroll(CATEGORIES_SHEET_SCROLL_LOCK_ID);

    const focusRaf = window.requestAnimationFrame(() => {
      const focusable = getFocusableElements(dialogRef.current);
      const first = focusable[0];
      if (first) {
        first.focus();
        return;
      }
      dialogRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(focusRaf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      unlockPageScroll(CATEGORIES_SHEET_SCROLL_LOCK_ID);

      const lastFocusedElement = lastFocusedElementRef.current;
      if (lastFocusedElement && document.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
      }
    };
  }, [onClose, open]);

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
        className="absolute inset-0 bg-black/45"
        aria-label={'Kategorien schlie\u00dfen'}
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        tabIndex={-1}
        className="bg-surface-solid/98 border-border absolute inset-0 flex flex-col overflow-hidden border-t shadow-2xl"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="border-border/80 bg-surface-solid/98 sticky top-0 z-10 -mx-4 border-b px-4 py-3">
            <div className="bg-surface-solid/55 border-border/80 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
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
                  <section
                    key={cat}
                    className="border-border/75 bg-surface-solid/25 overflow-hidden rounded-[var(--radius)] border"
                  >
                    <button
                      type="button"
                      className="focus-visible:ring-offset-bg hover:bg-surface-solid/45 flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
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
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectMetric(id);
                                  onClose();
                                }}
                                className={[
                                  'group relative w-full px-2.5 py-2.5 text-left text-sm font-semibold transition-colors sm:px-3.5 sm:py-3',
                                  'focus-visible:ring-offset-bg focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none',
                                  isActive
                                    ? 'bg-surface-solid/55 text-fg'
                                    : 'text-fg/90 hover:bg-surface-solid/35 focus-visible:bg-surface-solid/35',
                                ].join(' ')}
                                data-active={isActive ? 'true' : 'false'}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={[
                                      'mt-0.5 h-4 w-1 flex-none rounded-full transition-colors',
                                      isActive
                                        ? 'bg-accent'
                                        : 'group-hover:bg-accent/35 bg-transparent',
                                    ].join(' ')}
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-start justify-between gap-3">
                                      <span className="min-w-0 flex-1 truncate">
                                        {categoryDef.label || id}
                                      </span>
                                      {categoryDef.unit ? (
                                        <span className="text-muted mt-0.5 text-xs font-semibold whitespace-nowrap">
                                          {categoryDef.unit}
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
