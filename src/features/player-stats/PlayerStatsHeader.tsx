import { ArrowLeft, Languages } from 'lucide-react';

import { fmtGenerated } from './ui';

export function PlayerStatsHeader({
  playerName,
  isGerman,
  onToggleGerman,
  uuidFull,
  uuidCopied,
  onCopyUuid,
  generatedIso,
}: {
  playerName: string;
  isGerman: boolean;
  onToggleGerman: () => void;
  uuidFull: string;
  uuidCopied: boolean;
  onCopyUuid: () => void;
  generatedIso: string | null;
}) {
  return (
    <header className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
            Spieler-Statistik
          </p>
          <h2 className="text-fg mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {playerName ? `Statistiken von ${playerName}` : 'Spielerstatistik'}
          </h2>
          <p className="text-muted mt-2 max-w-3xl text-sm leading-relaxed sm:text-base">
            Hier siehst du alle Werte, Gegenstände und Kreaturen deines Spielers auf einen Blick.
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
        <a href="/statistiken/" className="mg-btn mg-btn--sm mg-btn--primary">
          <ArrowLeft size={16} /> Zurück zur Statistik
        </a>

        <button
          type="button"
          title="UUID kopieren"
          className="focus-visible:ring-offset-bg bg-surface-solid/45 text-fg hover:bg-surface-solid/65 relative inline-flex h-9 max-w-full items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onCopyUuid}
          disabled={!uuidFull}
        >
          <span className={uuidCopied ? 'text-transparent' : 'inline-flex items-center gap-1.5'}>
            <span className="text-muted/90 text-[10px] tracking-[0.14em] uppercase">UUID</span>
            <span className="font-mono text-[11px]">{uuidFull || 'nicht verfuegbar'}</span>
          </span>
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
    </header>
  );
}
