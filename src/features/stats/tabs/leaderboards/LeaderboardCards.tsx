import { memo } from 'react';

import type { MetricDef } from '../../types';
import { LIVE_COPY_DE } from '../../../../lib/live/copy.de';

type LeaderboardCardRow = {
  key: string;
  uuid: string;
  rank: number;
  medalClass: string | null;
  name: string;
  formattedValue: string;
  motionClassName?: string;
};

const INTERACTIVE_CARD_CLASS =
  'group focus-visible:bg-surface-solid/45 focus-visible:ring-accent/45 hover:bg-surface-solid/35 w-full cursor-pointer rounded-md px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-[-2px] focus-visible:outline-none';

function splitMetricValue(
  value: string,
  unit?: string,
): { valueText: string; unitText: string | null } {
  if (!unit) return { valueText: value, unitText: null };
  const suffix = ` ${unit}`;
  if (value.endsWith(suffix)) {
    return {
      valueText: value.slice(0, Math.max(0, value.length - suffix.length)),
      unitText: unit,
    };
  }
  return { valueText: value, unitText: unit };
}

const LeaderboardCardItem = memo(function LeaderboardCardItem({
  row,
  unit,
  onPlayerClick,
}: {
  row: LeaderboardCardRow;
  unit?: string;
  onPlayerClick: (uuid: string) => void;
}) {
  const { valueText, unitText } = splitMetricValue(row.formattedValue, unit);

  return (
    <li>
      <button
        type="button"
        onClick={() => onPlayerClick(row.uuid)}
        aria-label={`${row.name} \u00f6ffnen`}
        className={[INTERACTIVE_CARD_CLASS, row.motionClassName].filter(Boolean).join(' ')}
      >
        <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <span className="inline-flex min-w-[1.8rem] items-center justify-center text-center">
            {row.medalClass ? (
              <span className={row.medalClass} aria-label={`Platz ${row.rank}`}>
                {row.rank}
              </span>
            ) : (
              <span className="inline-flex min-w-[1.5rem] items-center justify-center font-medium tabular-nums">
                {row.rank}
              </span>
            )}
          </span>

          <span className="text-fg/90 inline-flex min-w-0 items-center gap-2">
            <img
              src={`https://minotar.net/helm/${encodeURIComponent(row.name)}/32.png`}
              alt=""
              className="h-8 w-8 flex-none rounded-lg bg-black/20"
              loading="lazy"
              decoding="async"
            />
            <span className="truncate">{row.name}</span>
          </span>

          <span className="text-right">
            <span className="text-fg block font-medium tabular-nums">{valueText}</span>
            {unitText ? (
              <span className="text-muted block text-[10px] tracking-wide uppercase">
                {unitText}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
});

export function LeaderboardCards({
  rows,
  listKey,
  def,
  isInitialLoad,
  placeholderRows,
  loaded,
  onPlayerClick,
}: {
  rows: LeaderboardCardRow[];
  listKey: string;
  def?: MetricDef;
  isInitialLoad: boolean;
  placeholderRows: number[];
  loaded: boolean;
  onPlayerClick: (uuid: string) => void;
}) {
  return (
    <div className="rounded-[calc(var(--radius)-1px)]">
      <ul key={listKey} className="divide-border/75 divide-y text-[13px]">
        {isInitialLoad
          ? placeholderRows.map((index) => (
              <li key={`placeholder-card-${index}`} aria-hidden="true" className="px-3 py-2.5">
                <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="bg-surface-solid/45 inline-flex h-4 w-7 animate-pulse rounded-md" />
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="bg-surface-solid/45 inline-flex h-8 w-8 animate-pulse rounded-lg" />
                    <span className="bg-surface-solid/45 inline-flex h-4 w-[min(9.5rem,70vw)] animate-pulse rounded-md" />
                  </span>
                  <span className="text-right">
                    <span className="bg-surface-solid/45 ml-auto inline-flex h-4 w-14 animate-pulse rounded-md" />
                    <span className="bg-surface-solid/45 mt-1 ml-auto inline-flex h-3 w-8 animate-pulse rounded-md" />
                  </span>
                </span>
              </li>
            ))
          : null}

        {loaded && rows.length === 0 ? (
          <li className="text-muted px-3 py-5 text-sm">{LIVE_COPY_DE.no_data_available}</li>
        ) : null}

        {rows.map((row) => (
          <LeaderboardCardItem
            key={row.key}
            row={row}
            unit={def?.unit}
            onPlayerClick={onPlayerClick}
          />
        ))}
      </ul>
    </div>
  );
}
