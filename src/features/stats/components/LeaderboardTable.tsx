import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, Copy, LoaderCircle } from 'lucide-react';
import type { MetricDef } from '../types';
import type { LeaderboardState } from '../types-ui';
import { formatMetricValue } from '../format';
import { Pagination } from './Pagination';
import { createTableRowMotion } from '../../ui/tableRowMotion';
import { LIVE_COPY_DE } from '../../../lib/live/copy.de';

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, input, select, textarea, [role="button"]'));
}

function getPlayerDetailPath(uuid: string): string {
  return `/statistiken/spieler/?uuid=${encodeURIComponent(uuid)}`;
}

function resolvePlayerDetailUrl(uuid: string): string {
  const path = getPlayerDetailPath(uuid);
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

export function LeaderboardTable({
  metricKey = 'default',
  def,
  state,
  loadingOverride,
  showCenterLoader,
  centerLoaderLabel,
  pageSize,
  getPlayerName,
  onPlayerClick,
  onGoPage,
  onLoadMore,
  surface = true,
  showDesktopCopyAction = false,
}: {
  metricKey?: string;
  def?: MetricDef;
  state: LeaderboardState;
  loadingOverride?: boolean;
  showCenterLoader?: boolean;
  centerLoaderLabel?: string;
  pageSize: number;
  getPlayerName: (uuid: string) => string;
  onPlayerClick: (uuid: string) => void;
  onGoPage: (page: number) => void;
  onLoadMore: () => void;
  surface?: boolean;
  showDesktopCopyAction?: boolean;
}) {
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  const page = useMemo(
    () => state.pages[state.currentPage] || [],
    [state.currentPage, state.pages],
  );
  const isLoading = loadingOverride ?? state.loading;
  const isInitialLoad = !state.loaded;
  const initialPlaceholderRows = Math.max(6, pageSize);
  const shouldShowCenterLoader = showCenterLoader ?? (isInitialLoad && isLoading);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCopiedUuid(null);
  }, [metricKey, state.currentPage]);

  const markCopied = (uuid: string) => {
    setCopiedUuid(uuid);
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopiedUuid((current) => (current === uuid ? null : current));
    }, 1_400);
  };

  const copyPlayerLink = async (uuid: string) => {
    const url = resolvePlayerDetailUrl(uuid);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        markCopied(uuid);
        return;
      }
    } catch {
      // Absichtlich leer: Fallback via prompt folgt.
    }

    if (typeof window !== 'undefined') {
      window.prompt('Link kopieren:', url);
    }
  };

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, uuid: string) => {
    if (isInteractiveTarget(event.target)) return;
    onPlayerClick(uuid);
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, uuid: string) => {
    if (isInteractiveTarget(event.target)) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPlayerClick(uuid);
    }
  };

  const tableMotion = createTableRowMotion({
    triggerKey: `${metricKey}-${state.currentPage}`,
    enabled: state.loaded && page.length > 0,
    maxRows: 10,
    stepMs: 30,
  });
  const headerCellClass = 'px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3';
  const stickyHeaderStyle = {
    background: 'var(--glass-nav-bg)',
    borderColor: 'transparent',
    boxShadow: 'inset 0 -1px 0 var(--glass-nav-border)',
    WebkitBackdropFilter: 'saturate(150%) blur(var(--glass-nav-blur))',
    backdropFilter: 'saturate(150%) blur(var(--glass-nav-blur))',
  } satisfies CSSProperties;

  return (
    <section
      className={[
        'relative min-h-[360px] min-w-0 [overflow-anchor:none]',
        surface
          ? 'mg-surface-2'
          : 'bg-surface-solid/40 border-border/80 rounded-[var(--radius)] border',
      ].join(' ')}
      aria-busy={isLoading}
    >
      <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-[calc(var(--radius)-1px)] lg:overflow-x-visible">
        <table className="w-full min-w-[390px] border-collapse text-sm sm:min-w-[520px]">
          <thead
            className="text-muted text-xs lg:sticky lg:top-[calc(var(--stats-sticky-content-top)-1px)] lg:z-10"
            style={stickyHeaderStyle}
          >
            <tr>
              <th className={headerCellClass} scope="col">
                Platz
              </th>
              <th className={headerCellClass} scope="col">
                Spieler
              </th>
              <th className={headerCellClass} scope="col">
                {def?.unit ? `Wert (${def.unit})` : 'Wert'}
              </th>
            </tr>
          </thead>
          <tbody
            key={tableMotion.tbodyKey}
            className="divide-border/75 divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3"
          >
            {isInitialLoad
              ? Array.from({ length: initialPlaceholderRows }).map((_, index) => (
                  <tr key={`placeholder-${index}`} aria-hidden="true">
                    <td className="whitespace-nowrap">
                      <span className="bg-surface-solid/45 inline-block h-4 w-8 animate-pulse rounded-md" />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-solid/45 inline-block h-8 w-8 animate-pulse rounded-lg" />
                        <span className="bg-surface-solid/45 inline-block h-4 w-[min(14rem,80%)] animate-pulse rounded-md" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="bg-surface-solid/45 inline-block h-4 w-16 animate-pulse rounded-md" />
                    </td>
                  </tr>
                ))
              : null}

            {state.loaded && page.length === 0 ? (
              <tr>
                <td className="text-muted px-2.5 py-5 text-sm sm:px-4" colSpan={3}>
                  {LIVE_COPY_DE.no_data_available}
                </td>
              </tr>
            ) : null}

            {page.map((row, i) => {
              const rank = state.currentPage * pageSize + (i + 1);
              const medalClass = rank <= 3 ? `mg-rank-medal mg-rank-medal--${rank}` : null;
              const name = getPlayerName(row.uuid);
              const motionProps = tableMotion.getRowProps(i);
              const isCopied = copiedUuid === row.uuid;
              return (
                <tr
                  key={`${row.uuid}-${i}`}
                  tabIndex={0}
                  onClick={(event) => handleRowClick(event, row.uuid)}
                  onKeyDown={(event) => handleRowKeyDown(event, row.uuid)}
                  aria-label={`${name} öffnen`}
                  className={[
                    'group hover:bg-surface-solid/35 focus-visible:bg-surface-solid/35 focus-visible:ring-accent/45 focus-visible:ring-offset-bg cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-offset-[-2px] focus-visible:outline-none',
                    motionProps.className,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={motionProps.style}
                >
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      {medalClass ? (
                        <span className={medalClass} aria-label={`Platz ${rank}`}>
                          {rank}
                        </span>
                      ) : (
                        <span className="inline-flex min-w-[1.5rem] items-center justify-center font-semibold tabular-nums">
                          {rank}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="min-w-0">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="text-fg/90 decoration-accent/70 group-hover:text-fg inline-flex min-w-0 items-center gap-2 rounded-md underline-offset-4 transition-colors group-hover:underline group-focus-visible:underline">
                        <img
                          src={`https://minotar.net/helm/${encodeURIComponent(name)}/32.png`}
                          alt=""
                          className="h-8 w-8 flex-none rounded-lg bg-black/20"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="truncate">{name}</span>
                      </span>

                      {showDesktopCopyAction ? (
                        <button
                          type="button"
                          data-row-action="copy-link"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyPlayerLink(row.uuid);
                          }}
                          className="focus-visible:ring-offset-bg text-muted hover:text-fg hidden h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none lg:inline-flex"
                          aria-label={isCopied ? 'Spielerlink kopiert' : 'Spielerlink kopieren'}
                          title={isCopied ? 'Link kopiert' : 'Link kopieren'}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">{formatMetricValue(row.value, def)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted px-2.5 pb-2 text-[11px] sm:hidden">
        Seitlich wischen, um alle Spalten zu sehen.
      </p>

      {isLoading ? (
        <div className="pointer-events-none absolute top-3 right-3">
          <span className="bg-surface-solid/75 text-muted inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {LIVE_COPY_DE.table_updating}
          </span>
        </div>
      ) : null}

      {shouldShowCenterLoader ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="bg-surface-solid/90 text-fg inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <LoaderCircle size={14} className="text-muted animate-spin" />
            {centerLoaderLabel || LIVE_COPY_DE.table_loading}
          </span>
        </div>
      ) : null}

      <div className="border-border/75 flex items-center justify-between gap-3 border-t px-2.5 py-3 sm:px-4">
        <Pagination state={state} onGo={onGoPage} onLoadMore={onLoadMore} />
      </div>
    </section>
  );
}
