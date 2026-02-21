import { Cog, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';

import { PlayerAutocomplete } from '../../components/PlayerAutocomplete';
import { StatsTabsScroller } from './StatsTabsScroller';
import type { PlayersSearchItem } from '../../types';
import type { TabKey } from '../../types-ui';
import type { LiveBadgeVariant } from '../../components/LiveBadge';

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

function resolveStaleChipLabel(variant: LiveBadgeVariant): string | null {
  if (variant === 'ok') return null;
  return 'Veraltet';
}

export function StatsToolbarMobile({
  activeTab,
  onTabChange,
  tabsDisabled,
  search,
  onChoosePlayer,
  liveVariant,
  optionsPanel,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabsDisabled: boolean;
  search: AutocompleteViewModel;
  onChoosePlayer: (uuid: string) => void;
  liveVariant: LiveBadgeVariant;
  optionsPanel: ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchPanelId = useId();
  const optionsPanelId = useId();
  const staleChipLabel = resolveStaleChipLabel(liveVariant);

  useEffect(() => {
    setSearchOpen(false);
    setOptionsOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!searchOpen && !optionsOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const wrap = rootRef.current;
      if (!wrap) return;
      if (wrap.contains(event.target as Node)) return;
      setSearchOpen(false);
      setOptionsOpen(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
    };
  }, [optionsOpen, searchOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <div className="mg-surface-2 flex h-14 items-center gap-2 overflow-hidden px-2">
        <StatsTabsScroller
          activeTab={activeTab}
          onTabChange={onTabChange}
          disabled={tabsDisabled}
        />

        {staleChipLabel ? (
          <span className="border-border/85 bg-surface-solid/55 text-muted hidden h-7 shrink-0 items-center rounded-full border px-2.5 text-[10px] font-semibold tracking-[0.08em] uppercase min-[390px]:inline-flex">
            {staleChipLabel}
          </span>
        ) : null}

        <button
          type="button"
          className="focus-visible:ring-offset-bg border-border/80 bg-surface-solid/35 text-fg hover:border-accent/40 hover:bg-surface-solid/55 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] border transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={() => {
            setSearchOpen((open) => !open);
            setOptionsOpen(false);
          }}
          aria-label="Suche"
          aria-expanded={searchOpen ? 'true' : 'false'}
          aria-controls={searchPanelId}
        >
          <Search size={16} />
        </button>

        <button
          type="button"
          className="focus-visible:ring-offset-bg border-border/80 bg-surface-solid/35 text-fg hover:border-accent/40 hover:bg-surface-solid/55 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] border transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={() => {
            setOptionsOpen((open) => !open);
            setSearchOpen(false);
          }}
          aria-label="Optionen"
          aria-expanded={optionsOpen ? 'true' : 'false'}
          aria-controls={optionsPanelId}
        >
          <Cog size={16} />
        </button>
      </div>

      {searchOpen ? (
        <div
          id={searchPanelId}
          className="bg-surface-solid/96 border-border absolute top-[calc(100%+0.35rem)] right-0 left-0 z-[170] rounded-[var(--radius)] border p-2 shadow-xl backdrop-blur-xl"
        >
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
            className="w-full lg:max-w-none"
          />
        </div>
      ) : null}

      {optionsOpen ? (
        <div
          id={optionsPanelId}
          className="bg-surface-solid/96 border-border absolute top-[calc(100%+0.35rem)] right-0 left-0 z-[170] rounded-[var(--radius)] border p-3 shadow-xl backdrop-blur-xl"
        >
          {optionsPanel}
        </div>
      ) : null}
    </div>
  );
}
