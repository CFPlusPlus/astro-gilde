import { ArrowLeftRight, Swords, X } from 'lucide-react';

import { PlayerAutocomplete } from '../PlayerAutocomplete';
import { ApiAlert } from '../StatsPrimitives';
import type { VersusSectionProps } from './types';

type VersusPlayerPickerProps = Pick<
  VersusSectionProps,
  | 'maxMetrics'
  | 'searchA'
  | 'searchB'
  | 'versusPlayerA'
  | 'versusPlayerB'
  | 'versusError'
  | 'versusNotice'
  | 'isSameVersusPlayer'
  | 'canRunVersus'
  | 'versusSwapFxClass'
  | 'versusCardAZClass'
  | 'versusCardBZClass'
  | 'onSetVersusPlayer'
  | 'onClearVersusPlayer'
  | 'onSetVersusSearchOpen'
  | 'onSwapVersusPlayers'
  | 'onUpdateVersusSearch'
  | 'onRunVersusCompare'
  | 'onResetVersus'
  | 'onGoToPlayer'
>;

type VersusPlayerCardProps = {
  side: 'A' | 'B';
  search: VersusSectionProps['searchA'];
  player: VersusSectionProps['versusPlayerA'];
  zClass: string;
  swapFxClass: string;
  onSetVersusPlayer: VersusSectionProps['onSetVersusPlayer'];
  onClearVersusPlayer: VersusSectionProps['onClearVersusPlayer'];
  onSetVersusSearchOpen: VersusSectionProps['onSetVersusSearchOpen'];
  onUpdateVersusSearch: VersusSectionProps['onUpdateVersusSearch'];
  onGoToPlayer: VersusSectionProps['onGoToPlayer'];
};

function VersusPlayerCard({
  side,
  search,
  player,
  zClass,
  swapFxClass,
  onSetVersusPlayer,
  onClearVersusPlayer,
  onSetVersusSearchOpen,
  onUpdateVersusSearch,
  onGoToPlayer,
}: VersusPlayerCardProps) {
  return (
    <div
      className={[
        'bg-surface border-border relative min-w-0 rounded-[var(--radius)] border p-3 shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300',
        zClass,
        swapFxClass,
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs font-semibold uppercase">Spieler {side}</p>
        {player ? (
          <button
            type="button"
            onClick={() => onClearVersusPlayer(side)}
            className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
            aria-label={`Spieler ${side} entfernen`}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      <div className="mt-2">
        <PlayerAutocomplete
          value={search.value}
          onChange={(next) => onUpdateVersusSearch(side, next)}
          items={search.items}
          open={search.open}
          onOpenChange={(open) => onSetVersusSearchOpen(side, open)}
          selectedIndex={search.selectedIndex}
          onSelectedIndexChange={search.setSelectedIndex}
          onChoose={(uuid) => onSetVersusPlayer(side, uuid)}
          wrapRef={search.wrapRef}
        />
      </div>
      {player ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={`https://minotar.net/helm/${encodeURIComponent(player.name)}/32.png`}
              alt=""
              className="h-8 w-8 flex-none rounded-lg bg-black/20"
              loading="lazy"
              decoding="async"
            />
            <div className="min-w-0">
              <p className="text-fg truncate text-sm font-semibold">{player.name}</p>
              <p className="text-muted truncate text-xs">{player.uuid}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onGoToPlayer(player.uuid)}
            className="mg-btn mg-btn--xs mg-btn--surface w-fit shrink-0"
          >
            Profil
          </button>
        </div>
      ) : (
        <p className="text-muted mt-2 text-xs">W&auml;hle einen Spieler aus der Liste.</p>
      )}
    </div>
  );
}

export function VersusPlayerPicker({
  maxMetrics,
  searchA,
  searchB,
  versusPlayerA,
  versusPlayerB,
  versusError,
  versusNotice,
  isSameVersusPlayer,
  canRunVersus,
  versusSwapFxClass,
  versusCardAZClass,
  versusCardBZClass,
  onSetVersusPlayer,
  onClearVersusPlayer,
  onSetVersusSearchOpen,
  onSwapVersusPlayers,
  onUpdateVersusSearch,
  onRunVersusCompare,
  onResetVersus,
  onGoToPlayer,
}: VersusPlayerPickerProps) {
  return (
    <div className="mg-card mg-card--outlined relative z-20 overflow-visible p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
            <Swords size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-fg font-semibold">Spieler-Vergleich</p>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              W&auml;hle zwei Spieler und starte den Vergleich. F&uuml;r beste Ergebnisse nutze
              konkrete Kategorien.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwapVersusPlayers}
          disabled={!versusPlayerA && !versusPlayerB}
          className="mg-btn mg-btn--sm mg-btn--surface"
        >
          <ArrowLeftRight size={16} />
          Tauschen
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <VersusPlayerCard
          side="A"
          search={searchA}
          player={versusPlayerA}
          zClass={versusCardAZClass}
          swapFxClass={versusSwapFxClass}
          onSetVersusPlayer={onSetVersusPlayer}
          onClearVersusPlayer={onClearVersusPlayer}
          onSetVersusSearchOpen={onSetVersusSearchOpen}
          onUpdateVersusSearch={onUpdateVersusSearch}
          onGoToPlayer={onGoToPlayer}
        />

        <div className="text-muted text-center text-xs font-semibold tracking-wide uppercase">
          vs
        </div>

        <VersusPlayerCard
          side="B"
          search={searchB}
          player={versusPlayerB}
          zClass={versusCardBZClass}
          swapFxClass={versusSwapFxClass}
          onSetVersusPlayer={onSetVersusPlayer}
          onClearVersusPlayer={onClearVersusPlayer}
          onSetVersusSearchOpen={onSetVersusSearchOpen}
          onUpdateVersusSearch={onUpdateVersusSearch}
          onGoToPlayer={onGoToPlayer}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-2 sm:items-center">
        <button
          type="button"
          onClick={onRunVersusCompare}
          disabled={!canRunVersus}
          className="mg-btn mg-btn--sm mg-btn--primary"
        >
          <Swords size={16} />
          Vergleichen
        </button>
        <button type="button" onClick={onResetVersus} className="mg-btn mg-btn--sm mg-btn--surface">
          Zur&uuml;cksetzen
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
          <span className="text-fg/90">Bitte w&auml;hle zwei unterschiedliche Spieler.</span>
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
  );
}
