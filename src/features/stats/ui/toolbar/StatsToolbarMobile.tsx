import { Cog, Search } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';

import { OptionsSheet } from '../sheets/OptionsSheet';
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
  showPageSize,
  pageSize,
  onPageSizeChange,
  topNHint,
  updatedAt,
  generatedIso,
  apiError,
  onReload,
  reloadDisabled,
  reloadInSeconds,
  activeLeaderboardCategoryLabel,
  onOpenLeaderboardCategories,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabsDisabled: boolean;
  search: AutocompleteViewModel;
  onChoosePlayer: (uuid: string) => void;
  liveVariant: LiveBadgeVariant;
  showPageSize: boolean;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  topNHint: string | null;
  updatedAt: number | null;
  generatedIso: string | null;
  apiError: string | null;
  onReload?: () => void;
  reloadDisabled: boolean;
  reloadInSeconds: number;
  activeLeaderboardCategoryLabel?: string | null;
  onOpenLeaderboardCategories?: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const searchApiRef = useRef<{
    setOpen: (next: boolean) => void;
    setSelectedIndex: (next: number) => void;
  }>({
    setOpen: () => undefined,
    setSelectedIndex: () => undefined,
  });
  const searchSheetId = useId();
  const optionsSheetId = useId();
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

  return (
    <div className="relative">
      <div className="mg-app-panel mg-app-panel--soft flex h-14 items-center gap-2 overflow-hidden px-2">
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
          aria-controls={optionsSheetId}
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

      <OptionsSheet
        open={optionsOpen}
        sheetId={optionsSheetId}
        onClose={() => setOptionsOpen(false)}
        activeTab={activeTab}
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
    </div>
  );
}
