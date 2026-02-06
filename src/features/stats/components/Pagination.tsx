import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { LeaderboardState } from '../types-ui';

export function Pagination({
  state,
  onGo,
  onLoadMore,
}: {
  state: LeaderboardState;
  onGo: (page: number) => void;
  onLoadMore: () => void;
}) {
  if (!state.loaded) return null;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {state.pages.map((_, i) => {
          const isActive = i === state.currentPage;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i)}
              className={[
                'bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors',
                isActive ? 'border-accent bg-accent/10' : '',
              ].join(' ')}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {state.hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors"
            disabled={state.loading}
          >
            <ArrowRight size={14} />
            Mehr laden
          </button>
        ) : (
          <span className="text-muted text-xs">Ende erreicht</span>
        )}
      </div>
    </div>
  );
}
