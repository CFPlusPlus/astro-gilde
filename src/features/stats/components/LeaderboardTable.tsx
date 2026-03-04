import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, LoaderCircle } from 'lucide-react';
import type { MetricDef } from '../types';
import type { LeaderboardState } from '../types-ui';
import { formatMetricValue } from '../format';
import { Pagination } from './Pagination';
import { LeaderboardCards } from '../tabs/leaderboards/LeaderboardCards';
import { createTableRowMotion, resolveTableMotionStartIndex } from '../../ui/tableRowMotion';
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

type LeaderboardRenderRow = {
  key: string;
  uuid: string;
  rank: number;
  rowHeaderId: string;
  medalClass: string | null;
  name: string;
  formattedValue: string;
  motionClassName?: string;
};

const INTERACTIVE_ROW_CLASS =
  'group hover:bg-surface-solid/35 focus-visible:bg-surface-solid/35 focus-visible:ring-accent/45 focus-visible:ring-offset-bg cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-offset-[-2px] focus-visible:outline-none';

const LeaderboardRow = memo(function LeaderboardRow({
  row,
  isCopied,
  showDesktopCopyAction,
  onPlayerClick,
  onCopyPlayerLink,
}: {
  row: LeaderboardRenderRow;
  isCopied: boolean;
  showDesktopCopyAction: boolean;
  onPlayerClick: (uuid: string) => void;
  onCopyPlayerLink: (uuid: string) => Promise<void>;
}) {
  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if (isInteractiveTarget(event.target)) return;
    onPlayerClick(row.uuid);
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (isInteractiveTarget(event.target)) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPlayerClick(row.uuid);
    }
  };

  return (
    <tr
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      aria-label={`${row.name} \u00f6ffnen`}
      className={[INTERACTIVE_ROW_CLASS, row.motionClassName].filter(Boolean).join(' ')}
    >
      <td className="whitespace-nowrap" headers="leaderboard-col-rank">
        <span className="inline-flex items-center gap-2">
          {row.medalClass ? (
            <span className={row.medalClass} aria-label={`Platz ${row.rank}`}>
              {row.rank}
            </span>
          ) : (
            <span className="inline-flex min-w-[1.5rem] items-center justify-center font-semibold tabular-nums">
              {row.rank}
            </span>
          )}
        </span>
      </td>
      <th
        id={row.rowHeaderId}
        scope="row"
        className="min-w-0 text-left font-normal"
        headers="leaderboard-col-player"
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="text-fg/90 decoration-accent/70 group-hover:text-fg inline-flex min-w-0 items-center gap-2 rounded-md underline-offset-4 transition-colors group-hover:underline group-focus-visible:underline">
            <img
              src={`https://minotar.net/helm/${encodeURIComponent(row.name)}/32.png`}
              alt=""
              className="h-8 w-8 flex-none rounded-lg bg-black/20"
              loading="lazy"
              decoding="async"
            />
            <span className="truncate">{row.name}</span>
          </span>

          {showDesktopCopyAction ? (
            <button
              type="button"
              data-row-action="copy-link"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void onCopyPlayerLink(row.uuid);
              }}
              className="focus-visible:ring-offset-bg text-muted hover:text-fg hidden h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none lg:inline-flex"
              aria-label={isCopied ? 'Spielerlink kopiert' : 'Spielerlink kopieren'}
              title={isCopied ? 'Link kopiert' : 'Link kopieren'}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          ) : null}
        </div>
      </th>
      <td className="whitespace-nowrap" headers={`${row.rowHeaderId} leaderboard-col-value`}>
        {row.formattedValue}
      </td>
    </tr>
  );
});

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
  const [motionStartIndex, setMotionStartIndex] = useState(0);
  const motionMaxRows = 16;
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const desktopTableWrapRef = useRef<HTMLDivElement | null>(null);

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

  const markCopied = useCallback((uuid: string) => {
    setCopiedUuid(uuid);
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopiedUuid((current) => (current === uuid ? null : current));
    }, 1_400);
  }, []);

  const copyPlayerLink = useCallback(
    async (uuid: string) => {
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
    },
    [markCopied],
  );

  const handleGoPage = useCallback(
    (nextPage: number) => {
      setMotionStartIndex(resolveTableMotionStartIndex(desktopTableWrapRef.current, motionMaxRows));
      onGoPage(nextPage);
    },
    [motionMaxRows, onGoPage],
  );

  const handleLoadMore = useCallback(() => {
    setMotionStartIndex(resolveTableMotionStartIndex(desktopTableWrapRef.current, motionMaxRows));
    onLoadMore();
  }, [motionMaxRows, onLoadMore]);

  const tableMotion = useMemo(
    () =>
      createTableRowMotion({
        triggerKey: `${metricKey}-${state.currentPage}`,
        enabled: state.loaded && page.length > 0,
        maxRows: motionMaxRows,
        stepMs: 30,
        startIndex: motionStartIndex,
      }),
    [metricKey, motionStartIndex, page.length, state.currentPage, state.loaded],
  );

  const renderedRows = useMemo<LeaderboardRenderRow[]>(
    () =>
      page.map((row, index) => {
        const rank = state.currentPage * pageSize + (index + 1);
        const motion = tableMotion.getRowProps(index);
        return {
          key: `${row.uuid}-${index}`,
          uuid: row.uuid,
          rank,
          rowHeaderId: `leaderboard-row-player-${state.currentPage}-${index}`,
          medalClass: rank <= 3 ? `mg-rank-medal mg-rank-medal--${rank}` : null,
          name: getPlayerName(row.uuid),
          formattedValue: formatMetricValue(row.value, def),
          motionClassName: motion.className,
        };
      }),
    [def, getPlayerName, page, pageSize, state.currentPage, tableMotion],
  );

  const placeholderRows = useMemo(
    () => Array.from({ length: initialPlaceholderRows }, (_, index) => index),
    [initialPlaceholderRows],
  );
  const headerCellClass = 'px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3';
  return (
    <section
      className={[
        'relative min-h-[360px] min-w-0 [overflow-anchor:none]',
        surface ? 'mg-surface-2' : 'mg-app-table',
      ].join(' ')}
      aria-busy={isLoading}
    >
      <div className="md:hidden">
        <LeaderboardCards
          rows={renderedRows}
          listKey={tableMotion.tbodyKey}
          def={def}
          isInitialLoad={isInitialLoad}
          placeholderRows={placeholderRows}
          loaded={state.loaded}
          onPlayerClick={onPlayerClick}
        />
      </div>

      <div className="hidden md:block">
        <div
          ref={desktopTableWrapRef}
          className="mg-scrollbar max-w-full overflow-x-auto overscroll-x-contain rounded-[calc(var(--radius)-1px)] lg:overflow-x-visible"
        >
          <table className="w-full min-w-[390px] border-collapse text-sm sm:min-w-[520px]">
            <caption className="sr-only">
              Rangliste f\u00fcr {def?.label || 'die ausgew\u00e4hlte Kategorie'}.
            </caption>
            <thead className="mg-table-sticky-head text-muted text-xs lg:sticky lg:top-[calc(var(--stats-sticky-content-top))] lg:z-10">
              <tr>
                <th id="leaderboard-col-rank" className={headerCellClass} scope="col">
                  Platz
                </th>
                <th id="leaderboard-col-player" className={headerCellClass} scope="col">
                  Spieler
                </th>
                <th id="leaderboard-col-value" className={headerCellClass} scope="col">
                  {def?.unit ? `Wert (${def.unit})` : 'Wert'}
                </th>
              </tr>
            </thead>
            <tbody
              key={tableMotion.tbodyKey}
              className="divide-border/75 divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3 [&>tr>th]:px-2.5 [&>tr>th]:py-2.5 sm:[&>tr>th]:px-4 sm:[&>tr>th]:py-3"
            >
              {isInitialLoad
                ? placeholderRows.map((index) => (
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

              {renderedRows.map((row) => (
                <LeaderboardRow
                  key={row.key}
                  row={row}
                  isCopied={copiedUuid === row.uuid}
                  showDesktopCopyAction={showDesktopCopyAction}
                  onPlayerClick={onPlayerClick}
                  onCopyPlayerLink={copyPlayerLink}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isLoading ? (
        <div className="pointer-events-none absolute top-3 right-3">
          <span className="mg-app-chip text-muted inline-flex items-center px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {LIVE_COPY_DE.table_updating}
          </span>
        </div>
      ) : null}

      {shouldShowCenterLoader ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="mg-app-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <LoaderCircle size={14} className="text-muted animate-spin" />
            {centerLoaderLabel || LIVE_COPY_DE.table_loading}
          </span>
        </div>
      ) : null}

      <div className="mg-app-divider flex items-center justify-between gap-3 px-2.5 py-3 sm:px-4">
        <Pagination state={state} onGo={handleGoPage} onLoadMore={handleLoadMore} />
      </div>
    </section>
  );
}
