import React from 'react';
import { LoaderCircle } from 'lucide-react';
import type { MetricDef } from '../types';
import type { LeaderboardState } from '../types-ui';
import { formatMetricValue } from '../format';
import { Pagination } from './Pagination';

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
}) {
  const page = state.pages[state.currentPage] || [];
  const isLoading = loadingOverride ?? state.loading;
  const isInitialLoad = !state.loaded;
  const initialPlaceholderRows = Math.max(6, pageSize);
  const transitionKey = `${metricKey}-${state.currentPage}-${state.loaded ? '1' : '0'}-${page.length}`;
  const shouldShowCenterLoader = showCenterLoader ?? (isInitialLoad && isLoading);

  return (
    <div
      className="mg-card relative min-h-[360px] min-w-0 overflow-hidden [overflow-anchor:none]"
      aria-busy={isLoading}
    >
      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[390px] text-sm sm:min-w-[520px]">
          <thead className="bg-surface-solid/40 text-muted text-xs">
            <tr>
              <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">Platz</th>
              <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">Spielername</th>
              <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                {def?.unit ? `Wert (${def.unit})` : 'Wert'}
              </th>
            </tr>
          </thead>
          <tbody
            key={transitionKey}
            className="mg-fade-in divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3"
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
                  {'Keine Daten verf\u00fcgbar.'}
                </td>
              </tr>
            ) : null}

            {page.map((row, i) => {
              const rank = state.currentPage * pageSize + (i + 1);
              const medalClass = rank <= 3 ? `mg-rank-medal mg-rank-medal--${rank}` : null;
              const name = getPlayerName(row.uuid);
              return (
                <tr key={`${row.uuid}-${i}`} className="group">
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
                    <button
                      type="button"
                      onClick={() => onPlayerClick(row.uuid)}
                      className="text-fg/90 group-hover:text-fg decoration-accent/60 focus-visible:ring-offset-bg inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-md text-left underline-offset-4 transition-colors group-hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
                      title="Zur Spielerstatistik"
                    >
                      <img
                        src={`https://minotar.net/helm/${encodeURIComponent(name)}/32.png`}
                        alt=""
                        className="h-8 w-8 flex-none rounded-lg bg-black/20"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="truncate">{name}</span>
                    </button>
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
          <span className="bg-surface border-border text-muted inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm">
            Aktualisiere...
          </span>
        </div>
      ) : null}

      {shouldShowCenterLoader ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="bg-surface/90 border-border text-fg inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
            <LoaderCircle size={14} className="text-muted animate-spin" />
            {centerLoaderLabel || 'Rangliste wird geladen...'}
          </span>
        </div>
      ) : null}

      <div className="border-border flex items-center justify-between gap-3 border-t px-2.5 py-3 sm:px-4">
        <Pagination state={state} onGo={onGoPage} onLoadMore={onLoadMore} />
      </div>
    </div>
  );
}
