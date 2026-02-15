import { ArrowLeftRight, Info, Swords, X } from 'lucide-react';

import { PlayerAutocomplete } from '../PlayerAutocomplete';
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

type VersusPlayerRowProps = {
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

function VersusPlayerRow({
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
}: VersusPlayerRowProps) {
  return (
    <div
      className={[
        'mg-row relative min-w-0 flex-col gap-3 px-1 transition-colors duration-300 sm:px-2 lg:flex-row lg:items-center',
        zClass,
        swapFxClass,
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-2 lg:w-56 lg:flex-none">
        {player ? (
          <img
            src={`https://minotar.net/helm/${encodeURIComponent(player.name)}/32.png`}
            alt=""
            className="h-8 w-8 flex-none rounded-lg bg-black/20"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="bg-surface-solid/45 text-muted inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-xs font-semibold">
            {side}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-muted text-[11px] font-semibold uppercase">Spieler {side}</p>
          <p className="text-fg truncate text-sm font-semibold">
            {player ? player.name : 'Nicht ausgew&auml;hlt'}
          </p>
          {player ? <p className="text-muted truncate text-xs">{player.uuid}</p> : null}
        </div>
      </div>

      <div className="min-w-0 flex-1">
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

      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        {player ? (
          <>
            <button
              type="button"
              onClick={() => onGoToPlayer(player.uuid)}
              className="mg-btn mg-btn--xs mg-btn--secondary w-fit shrink-0"
            >
              Profil
            </button>
            <button
              type="button"
              onClick={() => onClearVersusPlayer(side)}
              className="mg-btn mg-btn--xs mg-btn--ghost w-fit shrink-0"
              aria-label={`Spieler ${side} entfernen`}
              title={`Spieler ${side} entfernen`}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <span className="text-muted text-xs">W&auml;hle einen Spieler aus der Liste.</span>
        )}
      </div>
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
    <div className="mg-surface-2 relative z-20 overflow-visible p-5">
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
          className="mg-btn mg-btn--sm mg-btn--secondary"
        >
          <ArrowLeftRight size={16} />
          Tauschen
        </button>
      </div>

      <div className="mg-list divide-border/75 mt-4 divide-y">
        <VersusPlayerRow
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
        <VersusPlayerRow
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

        <div className="mg-row flex-wrap items-start gap-2 px-1 sm:items-center sm:px-2">
          <button
            type="button"
            onClick={onRunVersusCompare}
            disabled={!canRunVersus}
            className="mg-btn mg-btn--sm mg-btn--primary"
          >
            <Swords size={16} />
            Vergleichen
          </button>
          <button
            type="button"
            onClick={onResetVersus}
            className="mg-btn mg-btn--sm mg-btn--secondary"
          >
            Zur&uuml;cksetzen
          </button>
          <span className="text-muted text-xs sm:ml-auto">
            Maximal {maxMetrics} Kategorien gleichzeitig.
          </span>
        </div>

        {isSameVersusPlayer ? (
          <div className="px-1 py-3 sm:px-2">
            <div className="mg-notice mt-0 text-xs" data-variant="warning" role="status">
              <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
              <span className="text-fg/90">Bitte w&auml;hle zwei unterschiedliche Spieler.</span>
            </div>
          </div>
        ) : null}

        {versusNotice ? (
          <div className="px-1 py-3 sm:px-2">
            <div className="mg-notice text-muted mt-0 text-xs" data-variant="neutral" role="status">
              {versusNotice}
            </div>
          </div>
        ) : null}

        {versusError ? (
          <div className="px-1 py-3 sm:px-2">
            <div className="mg-notice mt-0 text-xs" data-variant="warning" role="alert">
              <span
                className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
                aria-hidden="true"
              >
                <Info size={14} />
              </span>
              <span className="text-fg/90">{versusError}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
