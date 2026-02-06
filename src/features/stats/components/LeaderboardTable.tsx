import React from 'react';
import type { MetricDef } from '../types';
import type { LeaderboardState } from '../types-ui';
import { formatMetricValue } from '../format';
import { Pagination } from './Pagination';

export function LeaderboardTable({
  def,
  state,
  pageSize,
  getPlayerName,
  onPlayerClick,
  onGoPage,
  onLoadMore,
}: {
  def?: MetricDef;
  state: LeaderboardState;
  pageSize: number;
  getPlayerName: (uuid: string) => string;
  onPlayerClick: (uuid: string) => void;
  onGoPage: (page: number) => void;
  onLoadMore: () => void;
}) {
  const page = state.pages[state.currentPage] || [];

  return (
    <div className="mg-card relative min-w-0 overflow-hidden">
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
          <tbody className="divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3">
            {state.loaded && page.length === 0 ? (
              <tr>
                <td className="text-muted px-2.5 py-5 text-sm sm:px-4" colSpan={3}>
                  Keine Daten verfügbar.
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
                        <span className="font-semibold">{rank}</span>
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

      {state.loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-md">
          <span className="bg-surface border-border text-fg inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm">
            Lädt…
          </span>
        </div>
      ) : null}

      <div className="border-border flex items-center justify-between gap-3 border-t px-2.5 py-3 sm:px-4">
        <Pagination state={state} onGo={onGoPage} onLoadMore={onLoadMore} />
      </div>
    </div>
  );
}
