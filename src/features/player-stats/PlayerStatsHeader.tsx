import type { RefObject } from 'react';
import { ArrowLeft, Languages } from 'lucide-react';

import { ApiAlert, fmtGenerated } from './ui';

export function PlayerStatsHeader({
  playerName,
  canRender,
  isGerman,
  onToggleGerman,
  uuidFull,
  uuidCopied,
  onCopyUuid,
  uuidBtnRef,
  uuidMinWidthRef,
  generatedIso,
  apiError,
}: {
  playerName: string;
  canRender: boolean;
  isGerman: boolean;
  onToggleGerman: () => void;
  uuidFull: string;
  uuidCopied: boolean;
  onCopyUuid: () => void;
  uuidBtnRef: RefObject<HTMLButtonElement | null>;
  uuidMinWidthRef: RefObject<number | null>;
  generatedIso: string | null;
  apiError: string | null;
}) {
  const uuidButtonText = uuidCopied ? 'Kopiert!' : uuidFull;

  return (
    <section className="mg-container pt-10 pb-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Spielerstatistik von <span>{playerName ? playerName : canRender ? 'Lädt…' : ''}</span>
            </h1>
            <p className="text-muted mt-2 max-w-3xl">
              Alle Werte, Items und Kreaturen eines Spielers – inklusive Filter und Sortierung.
            </p>
          </div>

          <button
            type="button"
            aria-pressed={isGerman}
            title="Zwischen Deutsch und Original wechseln"
            className="mg-btn mg-btn--md mg-btn--surface self-start"
            onClick={onToggleGerman}
          >
            <Languages size={16} />
            <span className="label">{isGerman ? 'DE' : 'EN'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href="/statistiken" className="mg-btn mg-btn--sm mg-btn--primary">
            <ArrowLeft size={16} /> Zurück zur Statistik
          </a>

          <button
            ref={uuidBtnRef}
            type="button"
            title="UUID kopieren"
            className="bg-surface border-border text-fg hover:bg-surface-solid/70 inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors"
            style={
              uuidMinWidthRef.current ? { minWidth: `${uuidMinWidthRef.current}px` } : undefined
            }
            onClick={onCopyUuid}
          >
            {uuidButtonText}
          </button>

          {generatedIso ? (
            <span className="bg-surface border-border text-muted inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium">
              {fmtGenerated(generatedIso)}
            </span>
          ) : null}
        </div>

        <ApiAlert message={apiError} />
      </div>
    </section>
  );
}
