import { Swords, Users } from 'lucide-react';

import { formatVersusDiff, formatVersusValue } from '../../versus';
import type { VersusSectionProps } from './types';

type VersusResultsProps = Pick<
  VersusSectionProps,
  | 'versusPlayerA'
  | 'versusPlayerB'
  | 'hasVersusData'
  | 'versusLoading'
  | 'versusMetricIds'
  | 'hasVersusResults'
  | 'versusSummary'
  | 'hasMissingVersusValues'
  | 'versusRows'
> & {
  surface?: boolean;
};

type HintConfig = {
  title: string;
  text: string;
  icon: 'players' | 'compare';
};

type VersusRow = VersusResultsProps['versusRows'][number];

function resolveInitialHint({
  versusPlayerA,
  versusPlayerB,
  hasVersusData,
}: Pick<
  VersusResultsProps,
  'versusPlayerA' | 'versusPlayerB' | 'hasVersusData'
>): HintConfig | null {
  if (!versusPlayerA || !versusPlayerB) {
    return {
      title: 'Wähle zwei Spieler für den Vergleich',
      text: 'Lege Spieler A und B fest, um den Vergleich zu starten.',
      icon: 'players',
    };
  }

  if (!hasVersusData) {
    return {
      title: 'Spielerstatistiken laden',
      text: 'Starte den Vergleich, um die kompletten Spielerstatistiken zu laden.',
      icon: 'compare',
    };
  }

  return null;
}

function resolveDetailHint({
  hasVersusData,
  versusMetricIds,
  hasVersusResults,
}: Pick<
  VersusResultsProps,
  'hasVersusData' | 'versusMetricIds' | 'hasVersusResults'
>): HintConfig | null {
  if (hasVersusData && versusMetricIds.length === 0) {
    return {
      title: 'Keine Kategorien ausgewaehlt',
      text: 'Waehle Kategorien aus, um den Detailvergleich zu erweitern.',
      icon: 'compare',
    };
  }

  if (hasVersusData && !hasVersusResults) {
    return {
      title: 'Vergleich bereit',
      text: 'Waehle Kategorien aus, um die Werte zu sehen.',
      icon: 'compare',
    };
  }

  return null;
}

function HintNotice({ hint }: { hint: HintConfig }) {
  const Icon = hint.icon === 'players' ? Users : Swords;

  return (
    <div className="mg-notice mt-3 text-sm" data-variant="neutral" role="status">
      <span
        className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
        aria-hidden="true"
      >
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="text-fg block font-semibold">{hint.title}</span>
        <span className="text-muted mt-1 block">{hint.text}</span>
      </span>
    </div>
  );
}

function VersusSummaryBlock({
  playerALabel,
  playerBLabel,
  winsA,
  winsB,
  ties,
  counted,
  hasMissingVersusValues,
}: {
  playerALabel: string;
  playerBLabel: string;
  winsA: number;
  winsB: number;
  ties: number;
  counted: number;
  hasMissingVersusValues: boolean;
}) {
  return (
    <div className="mg-list divide-border/75 divide-y">
      <div className="mg-row flex-col gap-2 px-1 sm:px-2">
        <p className="text-muted text-xs font-semibold">Zwischenstand</p>
        <div className="flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">
          <span className="mg-app-chip inline-flex w-full max-w-full items-center gap-1 px-3 py-1 text-xs font-semibold sm:w-auto">
            <span className="min-w-0 truncate">{playerALabel}</span>
            <span className="shrink-0">: {winsA}</span>
          </span>
          <span className="mg-app-chip inline-flex w-full max-w-full items-center gap-1 px-3 py-1 text-xs font-semibold sm:w-auto">
            <span className="min-w-0 truncate">{playerBLabel}</span>
            <span className="shrink-0">: {winsB}</span>
          </span>
          <span className="mg-app-chip text-muted inline-flex w-full items-center px-3 py-1 text-xs font-semibold sm:w-auto">
            Gleichstand: {ties}
          </span>
          <span className="text-muted w-full text-xs sm:w-auto">
            Verglichene Kategorien: {counted}
          </span>
        </div>
        {hasMissingVersusValues ? (
          <p className="text-muted text-xs">
            Hinweis: Einige Werte fehlen, wenn ein Spieler keinen Eintrag in der Kategorie hat.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function resolveVersusRowWinner(row: VersusRow): 'A' | 'B' | 'tie' | null {
  if (row.valueA === null || row.valueB === null) return null;
  if (row.valueA === row.valueB) return 'tie';
  return row.valueA > row.valueB ? 'A' : 'B';
}

function resolveVersusRowDiff(row: VersusRow): number | null {
  if (row.valueA === null || row.valueB === null) return null;
  return row.valueA - row.valueB;
}

function resolveVersusRowHeaderId(rowId: string): string {
  return `versus-row-${rowId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function VersusTableRow({ row, missingHint }: { row: VersusRow; missingHint: string }) {
  const def = row.def;
  const label = def?.label || row.id;
  const winner = resolveVersusRowWinner(row);
  const diff = resolveVersusRowDiff(row);
  const rowHeaderId = resolveVersusRowHeaderId(row.id);

  return (
    <tr key={row.id}>
      <th id={rowHeaderId} scope="row" headers="versus-col-category">
        <p className="text-fg font-semibold">{label}</p>
        <p className="text-muted mt-1 text-xs break-all">
          Gruppe: {def?.group || '-'} - ID: {row.id}
          {def?.unit ? ` - Einheit: ${def.unit}` : ''}
        </p>
      </th>
      <td
        className={winner === 'A' ? 'text-accent font-semibold' : 'text-fg'}
        headers={`${rowHeaderId} versus-col-player-a`}
      >
        {row.valueA === null ? '-' : formatVersusValue(row.valueA, def)}
        {row.valueA === null ? <p className="text-muted mt-1 text-xs">{missingHint}</p> : null}
      </td>
      <td
        className={winner === 'B' ? 'text-accent font-semibold' : 'text-fg'}
        headers={`${rowHeaderId} versus-col-player-b`}
      >
        {row.valueB === null ? '-' : formatVersusValue(row.valueB, def)}
        {row.valueB === null ? <p className="text-muted mt-1 text-xs">{missingHint}</p> : null}
      </td>
      <td className="text-fg/90" headers={`${rowHeaderId} versus-col-diff`}>
        {diff === null ? '-' : formatVersusDiff(diff, def)}
      </td>
    </tr>
  );
}

function VersusTable({
  playerALabel,
  playerBLabel,
  rows,
  loading,
}: {
  playerALabel: string;
  playerBLabel: string;
  rows: VersusResultsProps['versusRows'];
  loading: boolean;
}) {
  const missingHint = 'Keine Daten';

  return (
    <div className="mg-app-table relative mt-3 min-w-0">
      <div className="mg-scrollbar max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[560px] text-sm sm:min-w-[720px]">
          <caption className="sr-only">
            Vergleichstabelle fuer {playerALabel} und {playerBLabel}.
          </caption>
          <thead className="bg-surface-solid/40 text-muted text-xs">
            <tr>
              <th
                id="versus-col-category"
                scope="col"
                className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3"
              >
                Kategorie
              </th>
              <th
                id="versus-col-player-a"
                scope="col"
                className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3"
              >
                {playerALabel}
              </th>
              <th
                id="versus-col-player-b"
                scope="col"
                className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3"
              >
                {playerBLabel}
              </th>
              <th
                id="versus-col-diff"
                scope="col"
                className="px-2.5 py-2.5 text-left font-semibold sm:px-4 sm:py-3"
              >
                Differenz
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 [&>tr>td]:text-left sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3 [&>tr>th]:px-2.5 [&>tr>th]:py-2.5 [&>tr>th]:text-left sm:[&>tr>th]:px-4 sm:[&>tr>th]:py-3">
            {rows.map((row) => (
              <VersusTableRow key={row.id} row={row} missingHint={missingHint} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted px-2.5 pb-2 text-[11px] sm:hidden">
        Seitlich wischen, um alle Spalten zu sehen.
      </p>

      {loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-md">
          <span className="mg-app-chip inline-flex items-center px-4 py-2 text-sm font-semibold shadow-sm">
            Laedt...
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function VersusResults({
  versusPlayerA,
  versusPlayerB,
  hasVersusData,
  versusLoading,
  versusMetricIds,
  hasVersusResults,
  versusSummary,
  hasMissingVersusValues,
  versusRows,
  surface = false,
}: VersusResultsProps) {
  const playerALabel = versusPlayerA?.name || 'Spieler A';
  const playerBLabel = versusPlayerB?.name || 'Spieler B';

  const initialHint = resolveInitialHint({
    versusPlayerA,
    versusPlayerB,
    hasVersusData,
  });
  const detailHint = resolveDetailHint({
    hasVersusData,
    versusMetricIds,
    hasVersusResults,
  });

  return (
    <div className={[surface ? 'mg-app-panel p-4 sm:p-5' : 'min-w-0'].join(' ')}>
      {versusLoading && !hasVersusData ? (
        <div className="mg-notice mt-0 text-sm" data-variant="neutral" role="status">
          <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
          <span className="text-fg/90">
            Spielerstatistiken werden geladen. Je mehr Daten vorhanden sind, desto laenger dauert
            der Vergleich.
          </span>
        </div>
      ) : null}

      {initialHint ? (
        <HintNotice hint={initialHint} />
      ) : (
        <>
          {detailHint ? <HintNotice hint={detailHint} /> : null}

          {hasVersusResults ? (
            <>
              <VersusSummaryBlock
                playerALabel={playerALabel}
                playerBLabel={playerBLabel}
                winsA={versusSummary.winsA}
                winsB={versusSummary.winsB}
                ties={versusSummary.ties}
                counted={versusSummary.counted}
                hasMissingVersusValues={hasMissingVersusValues}
              />
              <VersusTable
                playerALabel={playerALabel}
                playerBLabel={playerBLabel}
                rows={versusRows}
                loading={versusLoading}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
