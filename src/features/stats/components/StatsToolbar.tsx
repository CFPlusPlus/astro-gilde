import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { Check, ChevronDown, ListFilter, RefreshCw } from 'lucide-react';

import { LastUpdated } from '../../../components/live/LastUpdated';
import { STATS_PAGE_SIZES } from '../constants';
import type { PlayersSearchItem } from '../types';
import type { TabKey } from '../types-ui';
import { StatsToolbarMobile } from '../ui/toolbar/StatsToolbarMobile';
import { LiveBadgeSlot, type LiveBadgeVariant } from './LiveBadge';
import { PlayerAutocomplete } from './PlayerAutocomplete';
import { StatsNavPills } from './StatsNavPills';
import { ApiAlert } from './StatsPrimitives';

type AutocompleteViewModel = {
  value: string;
  setValue: (next: string) => void;
  items: PlayersSearchItem[];
  open: boolean;
  setOpen: (next: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (next: number) => void;
  wrapRef: RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  errorMessage: string | null;
};

type StatsToolbarProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabsDisabled: boolean;
  search: AutocompleteViewModel;
  onChoosePlayer: (uuid: string) => void;
  activeVersusSlot?: 'A' | 'B' | null;
  onChooseVersusPlayer?: (side: 'A' | 'B', uuid: string, fallbackName?: string) => void;
  showPageSize: boolean;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  liveVariant: LiveBadgeVariant;
  updatedAt: number | null;
  generatedIso: string | null;
  apiError: string | null;
  onReload?: () => void;
  reloadDisabled?: boolean;
  reloadInSeconds?: number;
  activeLeaderboardCategoryLabel?: string | null;
  onOpenLeaderboardCategories?: () => void;
};

function useMediaQuery(query: string, initialValue = false): boolean {
  const [matches, setMatches] = useState(initialValue);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia(query);
    const update = () => {
      setMatches(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener !== 'function') return;

    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function TopNSelector({
  pageSize,
  onPageSizeChange,
  disabled,
  className,
}: {
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  disabled: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const options: readonly number[] = STATS_PAGE_SIZES;
  const selectedIndex = Math.max(0, options.indexOf(pageSize));
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open || disabled) return;
    optionRefs.current[selectedIndex]?.focus();
  }, [disabled, open, selectedIndex]);

  useEffect(() => {
    if (!disabled) return;
    setOpen(false);
  }, [disabled]);

  return (
    <div className={['relative', className || ''].join(' ').trim()} ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            return;
          }
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={listboxId}
        aria-label={`Top-N: ${pageSize}`}
        disabled={disabled}
        className={[
          'focus-visible:ring-offset-bg bg-surface-solid/45 border-border/85 text-fg inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border px-3 text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none',
          disabled
            ? 'bg-surface-solid/20 border-border/60 text-muted/70 cursor-not-allowed opacity-65 grayscale'
            : 'hover:bg-surface-solid/62 hover:border-accent/35',
        ].join(' ')}
      >
        <span className="text-muted whitespace-nowrap">Top-N</span>
        <span className="text-fg min-w-[1.8rem] text-center text-base leading-none font-semibold tabular-nums">
          {pageSize}
        </span>
        <ChevronDown
          size={15}
          className={['text-muted transition-transform', open ? 'rotate-180' : ''].join(' ')}
        />
      </button>

      {open && !disabled ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Top-N Eintr\u00e4ge"
          className="bg-surface-solid/96 border-border absolute top-[calc(100%+0.4rem)] right-0 z-[160] min-w-full overflow-hidden rounded-[var(--radius)] border py-1 shadow-xl backdrop-blur-xl"
        >
          {options.map((value, index) => {
            const isSelected = value === pageSize;
            return (
              <li key={value} role="presentation">
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  aria-selected={isSelected ? 'true' : 'false'}
                  type="button"
                  className={[
                    'focus-visible:ring-offset-bg inline-flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none',
                    isSelected
                      ? 'bg-accent/16 text-fg'
                      : 'text-fg/88 hover:bg-surface-solid/70 hover:text-fg',
                  ].join(' ')}
                  onClick={() => {
                    onPageSizeChange(value);
                    setOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setOpen(false);
                      return;
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      optionRefs.current[(index + 1) % options.length]?.focus();
                      return;
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      optionRefs.current[(index - 1 + options.length) % options.length]?.focus();
                    }
                  }}
                >
                  <span className="tabular-nums">{value}</span>
                  <span
                    className={[
                      'inline-flex h-4 w-4 items-center justify-center',
                      isSelected ? 'text-accent' : 'text-transparent',
                    ].join(' ')}
                  >
                    <Check size={13} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function StatsToolbar({
  activeTab,
  onTabChange,
  tabsDisabled,
  search,
  onChoosePlayer,
  activeVersusSlot = null,
  onChooseVersusPlayer,
  showPageSize,
  pageSize,
  onPageSizeChange,
  liveVariant,
  updatedAt,
  generatedIso,
  apiError,
  onReload,
  reloadDisabled = false,
  reloadInSeconds = 0,
  activeLeaderboardCategoryLabel = null,
  onOpenLeaderboardCategories,
}: StatsToolbarProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const showReload = typeof onReload === 'function';
  const reloadLabel = useMemo(() => {
    if (!reloadDisabled || reloadInSeconds <= 0) return 'Neu laden';
    return `Neu laden (${reloadInSeconds}s)`;
  }, [reloadDisabled, reloadInSeconds]);
  const handleMobileChoosePlayer = useCallback(
    (uuid: string) => {
      if (activeTab === 'versus' && activeVersusSlot && onChooseVersusPlayer) {
        const fallbackName = search.items.find((item) => item.uuid === uuid)?.name;
        onChooseVersusPlayer(activeVersusSlot, uuid, fallbackName);
        return;
      }

      onChoosePlayer(uuid);
    },
    [activeTab, activeVersusSlot, onChoosePlayer, onChooseVersusPlayer, search.items],
  );

  const topNHint = showPageSize ? null : 'Top-N wirkt in Server-K\u00f6nig und Ranglisten.';

  return (
    <header aria-label="Statistik Steuerung">
      {isDesktop ? (
        <>
          <div className="mg-surface-2 p-3 sm:p-4">
            <div className="space-y-3">
              <section className="border-border/75 bg-surface-solid/35 rounded-[var(--radius)] border p-2 sm:p-2.5">
                <div className="text-muted mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
                  <ListFilter size={12} className="text-accent/80" aria-hidden="true" />
                  Kategorien
                </div>
                <StatsNavPills
                  active={activeTab}
                  onChange={onTabChange}
                  disabled={tabsDisabled}
                  surface={false}
                  layout="one-row"
                />
              </section>

              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3">
                <PlayerAutocomplete
                  value={search.value}
                  onChange={search.setValue}
                  items={search.items}
                  open={search.open}
                  onOpenChange={search.setOpen}
                  selectedIndex={search.selectedIndex}
                  onSelectedIndexChange={search.setSelectedIndex}
                  onChoose={onChoosePlayer}
                  wrapRef={search.wrapRef}
                  isLoading={search.isLoading}
                  errorMessage={search.errorMessage}
                  className="w-full"
                />

                <TopNSelector
                  pageSize={pageSize}
                  onPageSizeChange={onPageSizeChange}
                  disabled={!showPageSize}
                  className="justify-self-end"
                />

                <div className="flex min-w-0 items-center justify-end gap-2">
                  <LiveBadgeSlot
                    variant={liveVariant}
                    updatedAt={updatedAt}
                    generatedIso={generatedIso}
                    className="shrink-0"
                  />
                  <LastUpdated
                    updatedAt={updatedAt}
                    className="text-muted max-w-[15rem] truncate text-xs"
                    showWhenMissing
                  />
                </div>

                {showReload ? (
                  <button
                    type="button"
                    onClick={onReload}
                    className="mg-btn mg-btn--sm mg-btn--surface justify-self-end"
                    disabled={reloadDisabled}
                    title={
                      reloadDisabled && reloadInSeconds > 0
                        ? 'Bitte kurz warten.'
                        : 'Daten neu laden'
                    }
                  >
                    <RefreshCw size={15} />
                    {reloadLabel}
                  </button>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            </div>
          </div>

          <ApiAlert message={apiError} />
        </>
      ) : (
        <StatsToolbarMobile
          activeTab={activeTab}
          onTabChange={onTabChange}
          tabsDisabled={tabsDisabled}
          search={search}
          onChoosePlayer={handleMobileChoosePlayer}
          liveVariant={liveVariant}
          showPageSize={showPageSize}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          topNHint={topNHint}
          updatedAt={updatedAt}
          generatedIso={generatedIso}
          apiError={apiError}
          onReload={onReload}
          reloadDisabled={reloadDisabled}
          reloadInSeconds={reloadInSeconds}
          activeLeaderboardCategoryLabel={activeLeaderboardCategoryLabel}
          onOpenLeaderboardCategories={onOpenLeaderboardCategories}
        />
      )}
    </header>
  );
}
