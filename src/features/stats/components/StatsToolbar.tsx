import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { Check, ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react';

import { LastUpdated } from '../../../components/live/LastUpdated';
import { STATS_PAGE_SIZES } from '../constants';
import type { PlayersSearchItem } from '../types';
import type { TabKey } from '../types-ui';
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
};

type StatsToolbarProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabsDisabled: boolean;
  search: AutocompleteViewModel;
  onChoosePlayer: (uuid: string) => void;
  showPageSize: boolean;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  liveVariant: LiveBadgeVariant;
  updatedAt: number | null;
  apiError: string | null;
  onReload?: () => void;
  reloadDisabled?: boolean;
  reloadInSeconds?: number;
};

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
        disabled={disabled}
        className={[
          'focus-visible:ring-offset-bg bg-surface-solid/45 border-border/85 text-fg inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border px-3 text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
          disabled
            ? 'text-muted/80 cursor-not-allowed'
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
          aria-label="Top-N Einträge"
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
                    'inline-flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
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
  showPageSize,
  pageSize,
  onPageSizeChange,
  liveVariant,
  updatedAt,
  apiError,
  onReload,
  reloadDisabled = false,
  reloadInSeconds = 0,
}: StatsToolbarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const showReload = typeof onReload === 'function';
  const reloadLabel = useMemo(() => {
    if (!reloadDisabled || reloadInSeconds <= 0) return 'Neu laden';
    return `Neu laden (${reloadInSeconds}s)`;
  }, [reloadDisabled, reloadInSeconds]);

  useEffect(() => {
    setMobileFiltersOpen(false);
  }, [activeTab]);

  const topNHint = showPageSize ? null : 'Top-N wirkt in Server-König und Ranglisten.';

  return (
    <header className="mg-surface-2 p-3 sm:p-4" aria-label="Statistik Steuerung">
      <div className="space-y-3">
        <section className="border-border/75 bg-surface-solid/25 rounded-[var(--radius)] border p-2 sm:p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-fg/90 text-xs font-semibold tracking-[0.12em] uppercase">
              Kategorie
            </p>
            <p className="text-muted text-xs">Wähle einen Bereich der Statistiken.</p>
          </div>
          <StatsNavPills
            active={activeTab}
            onChange={onTabChange}
            disabled={tabsDisabled}
            surface={false}
            layout="one-row"
          />
        </section>

        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:gap-3">
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
            className="w-full lg:max-w-none"
          />

          <TopNSelector
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            disabled={!showPageSize}
            className="justify-self-end"
          />

          <div className="flex min-w-0 items-center justify-end gap-2">
            <LiveBadgeSlot variant={liveVariant} className="shrink-0" />
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
                reloadDisabled && reloadInSeconds > 0 ? 'Bitte kurz warten.' : 'Daten neu laden'
              }
            >
              <RefreshCw size={15} />
              {reloadLabel}
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        <div className="space-y-3 lg:hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
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
              className="w-full lg:max-w-none"
            />
            <button
              type="button"
              className="mg-btn mg-btn--sm mg-btn--surface h-10 px-3"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen ? 'true' : 'false'}
              aria-controls="stats-toolbar-mobile-filter-panel"
            >
              <SlidersHorizontal size={15} />
              Filter
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <LiveBadgeSlot variant={liveVariant} className="shrink-0" showStaleIcon={false} />
              <LastUpdated
                updatedAt={updatedAt}
                className="text-muted max-w-[12.5rem] truncate text-xs"
                showWhenMissing
              />
            </div>
            {showReload ? (
              <button
                type="button"
                onClick={onReload}
                className="mg-btn mg-btn--xs mg-btn--surface"
                disabled={reloadDisabled}
                title={
                  reloadDisabled && reloadInSeconds > 0 ? 'Bitte kurz warten.' : 'Daten neu laden'
                }
              >
                <RefreshCw size={14} />
                {reloadLabel}
              </button>
            ) : null}
          </div>

          {mobileFiltersOpen ? (
            <div
              id="stats-toolbar-mobile-filter-panel"
              className="border-border/80 bg-surface-solid/45 rounded-[var(--radius)] border p-3"
            >
              <TopNSelector
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                disabled={!showPageSize}
                className="w-fit"
              />
              {topNHint ? (
                <p className="text-muted mt-2 text-xs leading-relaxed">{topNHint}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <ApiAlert message={apiError} />
    </header>
  );
}
