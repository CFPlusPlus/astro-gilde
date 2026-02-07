import type { RefObject } from 'react';
import { ArrowLeftRight, Check, Filter, SearchX, Swords, X } from 'lucide-react';

import type { PlayersSearchItem } from '../../types';
import type { VersusGroupedMetrics, VersusMetricDef } from '../../versus';
import { formatVersusDiff, formatVersusValue, getQuickVersusSelection } from '../../versus';
import type { VersusRow } from '../../hooks/useVersusState';
import { PlayerAutocomplete } from '../PlayerAutocomplete';
import { ApiAlert, SectionTitle } from '../StatsPrimitives';

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

export function VersusSection({
  maxMetrics,
  searchA,
  searchB,
  versusMetricFilter,
  onVersusMetricFilterChange,
  versusMetricIds,
  versusPlayerA,
  versusPlayerB,
  versusCatalog,
  versusLoading,
  versusError,
  versusNotice,
  versusFilteredCatalog,
  versusGroupedMetrics,
  hasNoVersusResults,
  isSameVersusPlayer,
  canRunVersus,
  versusSwapFxClass,
  versusCardAZClass,
  versusCardBZClass,
  hasVersusData,
  versusRows,
  versusSummary,
  hasVersusResults,
  hasMissingVersusValues,
  onSetVersusPlayer,
  onClearVersusPlayer,
  onSetVersusSearchOpen,
  onSwapVersusPlayers,
  onUpdateVersusSearch,
  onRunVersusCompare,
  onApplyVersusSelection,
  onToggleVersusMetric,
  onResetVersus,
  onGoToPlayer,
}: {
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
  versusSummary: { winsA: number; winsB: number; ties: number; counted: number };
  hasVersusResults: boolean;
  hasMissingVersusValues: boolean;
  onSetVersusPlayer: (side: 'A' | 'B', uuid: string) => void;
  onClearVersusPlayer: (side: 'A' | 'B') => void;
  onSetVersusSearchOpen: (side: 'A' | 'B', open: boolean) => void;
  onSwapVersusPlayers: () => void;
  onUpdateVersusSearch: (side: 'A' | 'B', next: string) => void;
  onRunVersusCompare: () => void;
  onApplyVersusSelection: (ids: string[]) => void;
  onToggleVersusMetric: (id: string) => void;
  onResetVersus: () => void;
  onGoToPlayer: (uuid: string) => void;
}) {
  return (
    <section aria-label="Versus" className="mg-container pb-12">
      <div className="mt-6 space-y-6">
        <SectionTitle
          title="Versus"
          subtitle="Vergleiche zwei Spieler in ausgewaehlten Kategorien."
        />

        <div className="mg-card relative z-20 overflow-visible p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
                <Swords size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-fg font-semibold">Spieler-Vergleich</p>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  Waehle zwei Spieler und starte den Vergleich. Fuer beste Ergebnisse nutze konkrete
                  Kategorien.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSwapVersusPlayers}
              disabled={!versusPlayerA && !versusPlayerB}
              className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeftRight size={16} />
              Tauschen
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div
              className={[
                'bg-surface border-border relative min-w-0 rounded-[var(--radius)] border p-3 shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300',
                versusCardAZClass,
                versusSwapFxClass,
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <p className="text-muted text-xs font-semibold uppercase">Spieler A</p>
                {versusPlayerA ? (
                  <button
                    type="button"
                    onClick={() => onClearVersusPlayer('A')}
                    className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
                    aria-label="Spieler A entfernen"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="mt-2">
                <PlayerAutocomplete
                  value={searchA.value}
                  onChange={(next) => onUpdateVersusSearch('A', next)}
                  items={searchA.items}
                  open={searchA.open}
                  onOpenChange={(open) => onSetVersusSearchOpen('A', open)}
                  selectedIndex={searchA.selectedIndex}
                  onSelectedIndexChange={searchA.setSelectedIndex}
                  onChoose={(uuid) => onSetVersusPlayer('A', uuid)}
                  wrapRef={searchA.wrapRef}
                />
              </div>
              {versusPlayerA ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={`https://minotar.net/helm/${encodeURIComponent(versusPlayerA.name)}/32.png`}
                      alt=""
                      className="h-8 w-8 flex-none rounded-lg bg-black/20"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="min-w-0">
                      <p className="text-fg truncate text-sm font-semibold">{versusPlayerA.name}</p>
                      <p className="text-muted truncate text-xs">{versusPlayerA.uuid}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoToPlayer(versusPlayerA.uuid)}
                    className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex w-fit shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors"
                  >
                    Profil
                  </button>
                </div>
              ) : (
                <p className="text-muted mt-2 text-xs">Waehle einen Spieler aus der Liste.</p>
              )}
            </div>

            <div className="text-muted text-center text-xs font-semibold tracking-wide uppercase">
              vs
            </div>

            <div
              className={[
                'bg-surface border-border relative min-w-0 rounded-[var(--radius)] border p-3 shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300',
                versusCardBZClass,
                versusSwapFxClass,
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <p className="text-muted text-xs font-semibold uppercase">Spieler B</p>
                {versusPlayerB ? (
                  <button
                    type="button"
                    onClick={() => onClearVersusPlayer('B')}
                    className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
                    aria-label="Spieler B entfernen"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="mt-2">
                <PlayerAutocomplete
                  value={searchB.value}
                  onChange={(next) => onUpdateVersusSearch('B', next)}
                  items={searchB.items}
                  open={searchB.open}
                  onOpenChange={(open) => onSetVersusSearchOpen('B', open)}
                  selectedIndex={searchB.selectedIndex}
                  onSelectedIndexChange={searchB.setSelectedIndex}
                  onChoose={(uuid) => onSetVersusPlayer('B', uuid)}
                  wrapRef={searchB.wrapRef}
                />
              </div>
              {versusPlayerB ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={`https://minotar.net/helm/${encodeURIComponent(versusPlayerB.name)}/32.png`}
                      alt=""
                      className="h-8 w-8 flex-none rounded-lg bg-black/20"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="min-w-0">
                      <p className="text-fg truncate text-sm font-semibold">{versusPlayerB.name}</p>
                      <p className="text-muted truncate text-xs">{versusPlayerB.uuid}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoToPlayer(versusPlayerB.uuid)}
                    className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex w-fit shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors"
                  >
                    Profil
                  </button>
                </div>
              ) : (
                <p className="text-muted mt-2 text-xs">Waehle einen Spieler aus der Liste.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-start gap-2 sm:items-center">
            <button
              type="button"
              onClick={onRunVersusCompare}
              disabled={!canRunVersus}
              className="bg-accent hover:bg-accent2 focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Swords size={16} />
              Vergleichen
            </button>
            <button
              type="button"
              onClick={onResetVersus}
              className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition-colors"
            >
              Zuruecksetzen
            </button>
            <span className="text-muted text-xs sm:ml-auto">
              Maximal {maxMetrics} Kategorien gleichzeitig.
            </span>
          </div>

          {isSameVersusPlayer ? (
            <div
              className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-xs"
              role="status"
            >
              <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
              <span className="text-fg/90">Bitte waehle zwei unterschiedliche Spieler.</span>
            </div>
          ) : null}

          {versusNotice ? (
            <div
              className="bg-surface border-border text-muted mt-3 rounded-[var(--radius)] border px-4 py-3 text-xs"
              role="status"
            >
              {versusNotice}
            </div>
          ) : null}

          {versusError ? <ApiAlert message={versusError} /> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {!hasVersusData ? (
            <div className="mg-card text-muted min-w-0 p-5 text-sm">
              Klicke auf "Vergleichen", um die Spielerstatistiken zu laden.
            </div>
          ) : (
            <div className="mg-card min-w-0 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-fg/90 text-sm font-semibold">Kategorien</p>
                <span className="text-muted text-xs">{versusCatalog.length} Eintraege</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onApplyVersusSelection(getQuickVersusSelection(versusCatalog))}
                  className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                >
                  Schnellwahl
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onApplyVersusSelection(versusFilteredCatalog.map((entry) => entry.id))
                  }
                  className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => onApplyVersusSelection([])}
                  className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                >
                  Keine
                </button>
                <span className="text-muted text-xs">
                  {versusMetricIds.length}/{maxMetrics} ausgewaehlt
                </span>
              </div>

              <div className="bg-surface-solid/30 border-border mt-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
                <Filter size={16} className="text-muted" />
                <input
                  value={versusMetricFilter}
                  onChange={(event) => onVersusMetricFilterChange(event.target.value)}
                  type="search"
                  placeholder="Filtern..."
                  className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
                  aria-label="Versus Kategorien filtern"
                />
                <button
                  type="button"
                  onClick={() => onVersusMetricFilterChange('')}
                  className={[
                    'mg-search-clear',
                    versusMetricFilter.trim().length > 0 ? '' : 'mg-search-clear--hidden',
                  ].join(' ')}
                  aria-label="Versus-Kategorien-Filter zuruecksetzen"
                  title="Filter zuruecksetzen"
                  tabIndex={versusMetricFilter.trim().length > 0 ? 0 : -1}
                >
                  <X size={14} />
                </button>
              </div>

              {hasNoVersusResults ? (
                <div
                  className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
                  role="status"
                >
                  <span
                    className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
                    aria-hidden="true"
                  >
                    <SearchX size={14} />
                  </span>
                  <span className="text-fg/90">Keine Kategorien gefunden.</span>
                </div>
              ) : null}

              <div className="mg-scrollbar-thin mt-4 max-h-[520px] overflow-auto pr-1">
                <div className="space-y-5">
                  {versusGroupedMetrics.map(({ cat, items }) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-muted min-w-0 text-xs font-semibold tracking-wide break-words uppercase">
                          {cat}
                        </p>
                        <span className="text-muted text-xs">{items.length}</span>
                      </div>

                      <ul className="space-y-1" role="list">
                        {items.map((entry) => {
                          const isActive = versusMetricIds.includes(entry.id);
                          return (
                            <li key={entry.id}>
                              <button
                                type="button"
                                onClick={() => onToggleVersusMetric(entry.id)}
                                className={[
                                  'border-border/60 hover:bg-surface-solid/45 text-fg/90 w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                                  isActive
                                    ? 'bg-surface-solid/55 border-accent/50'
                                    : 'bg-surface-solid/30',
                                ].join(' ')}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <span className="min-w-0 break-words">{entry.label}</span>
                                  <span className="flex items-center gap-2">
                                    {entry.unit ? (
                                      <span className="text-muted mt-0.5 text-xs font-semibold whitespace-nowrap">
                                        {entry.unit}
                                      </span>
                                    ) : null}
                                    {isActive ? <Check size={16} className="text-accent" /> : null}
                                  </span>
                                </div>
                                <p className="text-muted mt-1 text-xs break-all">ID: {entry.id}</p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="min-w-0 space-y-3">
            {versusLoading ? (
              <div className="mg-card p-4">
                <p className="text-fg font-semibold">Spielerstatistiken werden geladen...</p>
                <p className="text-muted mt-1 text-sm">
                  Je mehr Daten vorhanden sind, desto laenger dauert der Vergleich.
                </p>
              </div>
            ) : null}

            {!versusPlayerA || !versusPlayerB ? (
              <div className="mg-card p-6">
                <p className="text-fg font-semibold">Bitte zwei Spieler waehlen</p>
                <p className="text-muted mt-2 text-sm">
                  Nutze die Suche oben, um Spieler A und B auszuwaehlen.
                </p>
              </div>
            ) : !hasVersusData ? (
              <div className="mg-card p-6">
                <p className="text-fg font-semibold">Spielerstatistiken laden</p>
                <p className="text-muted mt-2 text-sm">
                  Klicke auf "Vergleichen", um die kompletten Spielerstatistiken zu laden.
                </p>
              </div>
            ) : versusMetricIds.length === 0 ? (
              <div className="mg-card p-6">
                <p className="text-fg font-semibold">Keine Kategorien ausgewaehlt</p>
                <p className="text-muted mt-2 text-sm">
                  Waehle links die Kategorien aus, die du vergleichen moechtest.
                </p>
              </div>
            ) : !hasVersusResults ? (
              <div className="mg-card p-6">
                <p className="text-fg font-semibold">Vergleich bereit</p>
                <p className="text-muted mt-2 text-sm">
                  Waehle Kategorien aus, um die Werte zu sehen.
                </p>
              </div>
            ) : (
              <>
                <div className="mg-card min-w-0 p-4">
                  <p className="text-muted text-xs font-semibold">Zwischenstand</p>
                  <div className="mt-2 flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">
                    <span className="bg-surface border-border text-fg inline-flex w-full max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                      <span className="min-w-0 truncate">{versusPlayerA?.name || 'Spieler A'}</span>
                      <span className="shrink-0">: {versusSummary.winsA}</span>
                    </span>
                    <span className="bg-surface border-border text-fg inline-flex w-full max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                      <span className="min-w-0 truncate">{versusPlayerB?.name || 'Spieler B'}</span>
                      <span className="shrink-0">: {versusSummary.winsB}</span>
                    </span>
                    <span className="bg-surface border-border text-muted inline-flex w-full items-center rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                      Gleichstand: {versusSummary.ties}
                    </span>
                    <span className="text-muted w-full text-xs sm:w-auto">
                      Verglichene Kategorien: {versusSummary.counted}
                    </span>
                  </div>
                  {hasMissingVersusValues ? (
                    <p className="text-muted mt-2 text-xs">
                      Hinweis: Einige Werte fehlen, wenn ein Spieler keinen Eintrag in der Kategorie
                      hat.
                    </p>
                  ) : null}
                </div>

                <div className="mg-card relative min-w-0 overflow-hidden">
                  <div className="max-w-full overflow-x-auto overscroll-x-contain">
                    <table className="w-full min-w-[560px] text-sm sm:min-w-[720px]">
                      <thead className="bg-surface-solid/40 text-muted text-xs">
                        <tr>
                          <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                            Kategorie
                          </th>
                          <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                            {versusPlayerA?.name || 'Spieler A'}
                          </th>
                          <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                            {versusPlayerB?.name || 'Spieler B'}
                          </th>
                          <th className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3">
                            Differenz
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3">
                        {versusRows.map((row) => {
                          const def = row.def;
                          const label = def?.label || row.id;
                          const winner =
                            row.valueA === null || row.valueB === null
                              ? null
                              : row.valueA === row.valueB
                                ? 'tie'
                                : row.valueA > row.valueB
                                  ? 'A'
                                  : 'B';
                          const diff =
                            row.valueA === null || row.valueB === null
                              ? null
                              : row.valueA - row.valueB;
                          const missingHint = 'Keine Daten';

                          return (
                            <tr key={row.id}>
                              <td>
                                <p className="text-fg font-semibold">{label}</p>
                                <p className="text-muted mt-1 text-xs break-all">
                                  Gruppe: {def?.group || '-'} - ID: {row.id}
                                  {def?.unit ? ` - Einheit: ${def.unit}` : ''}
                                </p>
                              </td>
                              <td
                                className={winner === 'A' ? 'text-accent font-semibold' : 'text-fg'}
                              >
                                {row.valueA === null ? '-' : formatVersusValue(row.valueA, def)}
                                {row.valueA === null ? (
                                  <p className="text-muted mt-1 text-xs">{missingHint}</p>
                                ) : null}
                              </td>
                              <td
                                className={winner === 'B' ? 'text-accent font-semibold' : 'text-fg'}
                              >
                                {row.valueB === null ? '-' : formatVersusValue(row.valueB, def)}
                                {row.valueB === null ? (
                                  <p className="text-muted mt-1 text-xs">{missingHint}</p>
                                ) : null}
                              </td>
                              <td className="text-fg/90">
                                {diff === null ? '-' : formatVersusDiff(diff, def)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted px-2.5 pb-2 text-[11px] sm:hidden">
                    Seitlich wischen, um alle Spalten zu sehen.
                  </p>

                  {versusLoading ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-md">
                      <span className="bg-surface border-border text-fg inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm">
                        Laedt...
                      </span>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
