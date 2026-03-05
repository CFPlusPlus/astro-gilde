import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Copy, Info, Swords, X } from 'lucide-react';

import { buildVersusShareUrlSearch } from '../../url-state';
import { PlayerSearchCombobox } from '../PlayerSearchCombobox';
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
> & {
  surface?: boolean;
};

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

const COPY_FEEDBACK_MS = 1_400;

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
        'mg-app-panel mg-app-panel--strong relative min-w-0 p-3 transition-colors duration-300 sm:p-4',
        zClass,
        swapFxClass,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
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
              {player ? player.name : 'Nicht ausgew\u00e4hlt'}
            </p>
            {player ? <p className="text-muted truncate text-xs">{player.uuid}</p> : null}
          </div>
        </div>

        {player ? (
          <div className="flex items-center gap-2">
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
          </div>
        ) : null}
      </div>

      <div className="mt-3 min-w-0">
        <PlayerSearchCombobox
          value={search.value}
          onChange={(next) => onUpdateVersusSearch(side, next)}
          items={search.items}
          open={search.open}
          onOpenChange={(open) => onSetVersusSearchOpen(side, open)}
          selectedIndex={search.selectedIndex}
          onSelectedIndexChange={search.setSelectedIndex}
          onChoose={(uuid) => onSetVersusPlayer(side, uuid)}
          wrapRef={search.wrapRef}
          isLoading={search.isLoading}
          errorMessage={search.errorMessage}
        />
      </div>

      {!player ? (
        <p className="text-muted mt-2 text-xs">{'W\u00e4hle einen Spieler aus der Liste.'}</p>
      ) : null}
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
  surface = true,
}: VersusPlayerPickerProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const copiedLinkTimeoutRef = useRef<number | null>(null);
  const canCopyLink = Boolean(versusPlayerA && versusPlayerB);

  useEffect(() => {
    return () => {
      if (copiedLinkTimeoutRef.current !== null) {
        window.clearTimeout(copiedLinkTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCopiedLink(false);
  }, [versusPlayerA?.uuid, versusPlayerB?.uuid]);

  const markCopied = () => {
    setCopiedLink(true);

    if (copiedLinkTimeoutRef.current !== null) {
      window.clearTimeout(copiedLinkTimeoutRef.current);
    }

    copiedLinkTimeoutRef.current = window.setTimeout(() => {
      setCopiedLink(false);
    }, COPY_FEEDBACK_MS);
  };

  const copyVersusLink = async () => {
    if (typeof window === 'undefined') return;

    const search = buildVersusShareUrlSearch({
      playerAUuid: versusPlayerA?.uuid || null,
      playerBUuid: versusPlayerB?.uuid || null,
    });
    const nextPath = `${window.location.pathname}${search}${window.location.hash}`;
    const absoluteUrl = new URL(
      `${window.location.pathname}${search}`,
      window.location.origin,
    ).toString();

    try {
      window.history.replaceState({}, '', nextPath);
    } catch {
      // Unkritisch: History-API kann blockiert sein.
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteUrl);
        markCopied();
        return;
      }
    } catch {
      // Absichtlich leer: Fallback via prompt folgt.
    }

    window.prompt('Link kopieren:', absoluteUrl);
  };

  return (
    <div
      className={[
        surface ? 'mg-app-panel p-4 sm:p-5' : 'min-w-0',
        'relative z-20 overflow-visible',
      ].join(' ')}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
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
        <div className="flex items-center justify-center lg:min-h-[220px]">
          <span className="mg-app-chip mg-app-chip--accent inline-flex h-10 min-w-10 items-center justify-center px-3 text-xs font-semibold tracking-wide">
            VS
          </span>
        </div>
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
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2 sm:items-center">
        <button
          type="button"
          onClick={onSwapVersusPlayers}
          disabled={!versusPlayerA && !versusPlayerB}
          className="mg-btn mg-btn--sm mg-btn--secondary"
        >
          <ArrowLeftRight size={16} />
          Tauschen
        </button>
        <button
          type="button"
          onClick={() => {
            void copyVersusLink();
          }}
          disabled={!canCopyLink}
          className="mg-btn mg-btn--sm mg-btn--secondary"
          aria-live="polite"
        >
          {copiedLink ? <Check size={16} /> : <Copy size={16} />}
          {copiedLink ? 'Link kopiert' : 'Link kopieren'}
        </button>
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
          {'Zur\u00fccksetzen'}
        </button>
        <span className="text-muted text-xs sm:ml-auto">
          Maximal {maxMetrics} Kategorien gleichzeitig.
        </span>
      </div>

      {isSameVersusPlayer ? (
        <div className="mt-3">
          <div className="mg-notice mt-0 text-xs" data-variant="warning" role="status">
            <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
            <span className="text-fg/90">{'Bitte w\u00e4hle zwei unterschiedliche Spieler.'}</span>
          </div>
        </div>
      ) : null}

      {versusNotice ? (
        <div className="mt-3">
          <div className="mg-notice text-muted mt-0 text-xs" data-variant="neutral" role="status">
            {versusNotice}
          </div>
        </div>
      ) : null}

      {versusError ? (
        <div className="mt-3">
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
  );
}
