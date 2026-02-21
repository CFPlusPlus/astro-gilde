import type { RefObject } from 'react';

import type { VersusRow } from '../../hooks/useVersusState';
import type { PlayersSearchItem } from '../../types';
import type { VersusGroupedMetrics, VersusMetricDef } from '../../versus';

export type VersusPlayerSide = 'A' | 'B';

export type AutocompleteViewModel = {
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

export type VersusSummary = {
  winsA: number;
  winsB: number;
  ties: number;
  counted: number;
};

export type VersusSectionProps = {
  maxMetrics: number;
  searchA: AutocompleteViewModel;
  searchB: AutocompleteViewModel;
  versusMetricFilter: string;
  onVersusMetricFilterChange: (next: string) => void;
  versusMetricIds: string[];
  versusPlayerA: PlayersSearchItem | null;
  versusPlayerB: PlayersSearchItem | null;
  versusCatalog: VersusMetricDef[];
  versusLoading: boolean;
  versusError: string | null;
  versusNotice: string | null;
  versusFilteredCatalog: VersusMetricDef[];
  versusGroupedMetrics: VersusGroupedMetrics;
  hasNoVersusResults: boolean;
  isSameVersusPlayer: boolean;
  canRunVersus: boolean;
  versusSwapFxClass: string;
  versusCardAZClass: string;
  versusCardBZClass: string;
  hasVersusData: boolean;
  versusRows: VersusRow[];
  versusSummary: VersusSummary;
  hasVersusResults: boolean;
  hasMissingVersusValues: boolean;
  onSetVersusPlayer: (side: VersusPlayerSide, uuid: string) => void;
  onClearVersusPlayer: (side: VersusPlayerSide) => void;
  onSetVersusSearchOpen: (side: VersusPlayerSide, open: boolean) => void;
  onSwapVersusPlayers: () => void;
  onUpdateVersusSearch: (side: VersusPlayerSide, next: string) => void;
  onRunVersusCompare: () => void;
  onApplyVersusSelection: (ids: string[]) => void;
  onToggleVersusMetric: (id: string) => void;
  onResetVersus: () => void;
  onGoToPlayer: (uuid: string) => void;
};
