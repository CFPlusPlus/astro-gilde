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
  generatedIso: string | null;
  apiError: string | null;
}) {
  return (
    <section className="mg-surface-1">
      <div className="mg-container pt-10 pb-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Spielerstatistik von{' '}
                <span>{playerName ? playerName : canRender ? 'Lädt…' : ''}</span>
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
              type="button"
              title="UUID kopieren"
              className="focus-visible:ring-offset-bg bg-surface-solid/45 text-fg hover:bg-surface-solid/65 relative inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
              onClick={onCopyUuid}
            >
              <span className={uuidCopied ? 'text-transparent' : ''}>{uuidFull}</span>
              {uuidCopied ? (
                <span className="pointer-events-none absolute inset-0 inline-flex items-center justify-center px-3">
                  Kopiert!
                </span>
              ) : null}
            </button>

            {generatedIso ? (
              <span className="bg-surface-solid/40 text-muted inline-flex h-9 items-center rounded-full px-3 text-xs font-medium">
                {fmtGenerated(generatedIso)}
              </span>
            ) : null}
          </div>

          <ApiAlert message={apiError} />
        </div>
      </div>
    </section>
  );
}
