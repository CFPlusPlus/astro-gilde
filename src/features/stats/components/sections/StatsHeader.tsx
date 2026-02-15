import type { RefObject } from 'react';

import { STATS_PAGE_SIZES } from '../../constants';
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
  title,
  description,
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
  title: string;
  description: string;
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
    <header className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
            Statistik-Zentrale
          </p>
          <h2 className="text-fg mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          <p className="text-muted mt-2 max-w-3xl text-sm leading-relaxed sm:text-base">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
          <Chip>
            <span
              className="bg-accent mr-1.5 inline-block h-2 w-2 rounded-full"
              aria-hidden="true"
            />
            Live
          </Chip>
          {generatedIso ? <Chip>Zuletzt aktualisiert: {fmtDateBerlin(generatedIso)}</Chip> : null}
          {typeof playerCount === 'number' ? <Chip>{fmtNumber(playerCount)} Spieler</Chip> : null}
        </div>
      </div>

      <div className="space-y-4">
        <StatsNavPills
          active={activeTab}
          onChange={onTabChange}
          disabled={tabsDisabled}
          surface={false}
        />

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
            {showPageSize ? (
              <label className="bg-surface border-border text-fg inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-md">
                <span className="text-muted">{'Eintr\u00e4ge'}</span>
                <select
                  value={pageSize}
                  onChange={(event) => onPageSizeChange(Number(event.target.value) || 10)}
                  className="text-fg bg-transparent text-xs leading-none font-semibold outline-none"
                  aria-label={'Eintr\u00e4ge pro Seite'}
                >
                  {STATS_PAGE_SIZES.map((value) => (
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
    </header>
  );
}
