import { Cog, Search } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

import { SearchSheet } from '../sheets/SearchSheet';
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
  const searchApiRef = useRef<{
    setOpen: (next: boolean) => void;
    setSelectedIndex: (next: number) => void;
  }>({
    setOpen: () => undefined,
    setSelectedIndex: () => undefined,
  });
  const searchSheetId = useId();
  const optionsPanelId = useId();
  const staleChipLabel = resolveStaleChipLabel(liveVariant);

  searchApiRef.current = {
    setOpen: search.setOpen,
    setSelectedIndex: search.setSelectedIndex,
  };

  const closeSearchSheet = useCallback(() => {
    setSearchOpen(false);
    searchApiRef.current.setOpen(false);
    searchApiRef.current.setSelectedIndex(-1);
  }, []);

  const handleChooseFromSearch = useCallback(
    (uuid: string) => {
      onChoosePlayer(uuid);
      closeSearchSheet();
    },
    [closeSearchSheet, onChoosePlayer],
  );

  useEffect(() => {
    closeSearchSheet();
    setOptionsOpen(false);
  }, [activeTab, closeSearchSheet]);

  useEffect(() => {
    if (!optionsOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const wrap = rootRef.current;
      if (!wrap) return;
      if (wrap.contains(event.target as Node)) return;
      setOptionsOpen(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
    };
  }, [optionsOpen]);

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
            setSearchOpen((open) => {
              const next = !open;
              if (!next) {
                searchApiRef.current.setOpen(false);
                searchApiRef.current.setSelectedIndex(-1);
              }
              return next;
            });
            setOptionsOpen(false);
          }}
          aria-label="Suche"
          aria-haspopup="dialog"
          aria-expanded={searchOpen ? 'true' : 'false'}
          aria-controls={searchSheetId}
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

      <SearchSheet
        open={searchOpen}
        sheetId={searchSheetId}
        search={search}
        onClose={closeSearchSheet}
        onChoosePlayer={handleChooseFromSearch}
      />

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
