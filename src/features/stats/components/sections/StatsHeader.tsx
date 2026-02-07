import type { RefObject } from 'react';

import { fmtDateBerlin, fmtNumber } from '../../format';
import type { PlayersSearchItem } from '../../types';
import type { TabKey } from '../../types-ui';
import { PlayerAutocomplete } from '../PlayerAutocomplete';
import { StatsNavPills } from '../StatsNavPills';
import { ApiAlert, Chip } from '../StatsPrimitives';

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

export function StatsHeader({
  activeTab,
  onTabChange,
  tabsDisabled,
  search,
  onChoosePlayer,
  playerCount,
  generatedIso,
  showPageSize,
  pageSize,
  onPageSizeChange,
  apiError,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabsDisabled: boolean;
  search: AutocompleteViewModel;
  onChoosePlayer: (uuid: string) => void;
  playerCount: number | null;
  generatedIso: string | null;
  showPageSize: boolean;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  apiError: string | null;
}) {
  return (
    <section className="mg-container pb-8">
      <div className="mt-2 space-y-4">
        <StatsNavPills active={activeTab} onChange={onTabChange} disabled={tabsDisabled} />

        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
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
          />

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {typeof playerCount === 'number' ? <Chip>{fmtNumber(playerCount)} Spieler</Chip> : null}
            {generatedIso ? <Chip>Stand: {fmtDateBerlin(generatedIso)}</Chip> : null}

            {showPageSize ? (
              <label className="bg-surface border-border text-fg inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-md">
                <span className="text-muted">{'Eintr\u00e4ge'}</span>
                <select
                  value={pageSize}
                  onChange={(event) => onPageSizeChange(Number(event.target.value) || 10)}
                  className="text-fg bg-transparent text-xs leading-none font-semibold outline-none"
                  aria-label={'Eintr\u00e4ge pro Seite'}
                >
                  {[10, 20, 30, 50].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>

        <ApiAlert message={apiError} />
      </div>
    </section>
  );
}
