import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { LeaderboardState } from '../types-ui';

type PageControl = number | 'ellipsis-left' | 'ellipsis-right';

const COMPACT_PAGINATION_THRESHOLD = 10;
const COMPACT_PAGE_WINDOW = 5;

export function resolvePageControls(totalPages: number, currentPage: number): PageControl[] {
  if (totalPages <= 0) return [];
  if (totalPages <= COMPACT_PAGINATION_THRESHOLD) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const lastPage = totalPages - 1;
  const innerWindowSize = Math.min(COMPACT_PAGE_WINDOW, Math.max(1, totalPages - 2));
  const halfWindow = Math.floor(innerWindowSize / 2);

  let start = Math.max(1, currentPage - halfWindow);
  const end = Math.min(lastPage - 1, start + innerWindowSize - 1);
  start = Math.max(1, end - innerWindowSize + 1);

  const controls: PageControl[] = [0];

  if (start > 1) {
    controls.push('ellipsis-left');
  }

  for (let pageIndex = start; pageIndex <= end; pageIndex += 1) {
    controls.push(pageIndex);
  }

  if (end < lastPage - 1) {
    controls.push('ellipsis-right');
  }

  controls.push(lastPage);
  return controls;
}

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

  const totalPages = state.pages.length;
  const controls = resolvePageControls(totalPages, state.currentPage);
  const canGoPrev = state.currentPage > 0;
  const canGoNext = state.currentPage < totalPages - 1;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onGo(state.currentPage - 1)}
          className="mg-btn mg-btn--xs mg-btn--surface mg-pagination-control"
          disabled={!canGoPrev}
          aria-label="Vorherige Seite"
        >
          <ArrowLeft size={14} />
        </button>

        {controls.map((control) => {
          if (typeof control !== 'number') {
            return (
              <span key={control} className="text-muted px-1 text-xs" aria-hidden="true">
                ...
              </span>
            );
          }

          const isActive = control === state.currentPage;
          return (
            <button
              key={control}
              type="button"
              onClick={() => onGo(control)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Seite ${control + 1}${isActive ? ', aktuelle Seite' : ''}`}
              data-active={isActive ? 'true' : 'false'}
              className={[
                'mg-btn mg-btn--xs mg-btn--surface mg-pagination-control mg-pagination-page',
                isActive ? 'mg-pagination-page--active' : '',
              ].join(' ')}
            >
              {control + 1}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onGo(state.currentPage + 1)}
          className="mg-btn mg-btn--xs mg-btn--surface mg-pagination-control"
          disabled={!canGoNext}
          aria-label="Nächste Seite"
        >
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {state.hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            className="mg-btn mg-btn--xs mg-btn--surface mg-pagination-load-more"
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
