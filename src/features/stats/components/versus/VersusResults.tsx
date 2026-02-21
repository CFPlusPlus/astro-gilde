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
  let initialHintTitle = '';
  let initialHintText = '';
  let initialHintIcon: 'players' | 'compare' = 'compare';

  const playerALabel = versusPlayerA?.name || 'Spieler A';
  const playerBLabel = versusPlayerB?.name || 'Spieler B';

  if (!versusPlayerA || !versusPlayerB) {
    initialHintTitle = 'W\u00e4hle zwei Spieler f\u00fcr den Vergleich';
    initialHintText = 'Lege Spieler A und B fest, um den Vergleich zu starten.';
    initialHintIcon = 'players';
  } else if (!hasVersusData) {
    initialHintTitle = 'Spielerstatistiken laden';
    initialHintText = 'Starte den Vergleich, um die kompletten Spielerstatistiken zu laden.';
  }

  let detailHintTitle = '';
  let detailHintText = '';

  if (hasVersusData && versusMetricIds.length === 0) {
    detailHintTitle = 'Keine Kategorien ausgew\u00e4hlt';
    detailHintText = 'W\u00e4hle Kategorien aus, um den Detailvergleich zu erweitern.';
  } else if (hasVersusData && !hasVersusResults) {
    detailHintTitle = 'Vergleich bereit';
    detailHintText = 'W\u00e4hle Kategorien aus, um die Werte zu sehen.';
  }

  const InitialHintIcon = initialHintIcon === 'players' ? Users : Swords;
  const shouldShowInitialHint = initialHintTitle.length > 0;
  const shouldShowDetailHint = detailHintTitle.length > 0;

  return (
    <div className={[surface ? 'mg-surface-2 p-4 sm:p-5' : 'min-w-0'].join(' ')}>
      {versusLoading && !hasVersusData ? (
        <div className="mg-notice mt-0 text-sm" data-variant="neutral" role="status">
          <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" />
          <span className="text-fg/90">
            Spielerstatistiken werden geladen. Je mehr Daten vorhanden sind, desto l\u00e4nger
            dauert der Vergleich.
          </span>
        </div>
      ) : null}

      {shouldShowInitialHint ? (
        <div className="mg-notice mt-3 text-sm" data-variant="neutral" role="status">
          <span
            className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
            aria-hidden="true"
          >
            <InitialHintIcon size={14} />
          </span>
          <span className="min-w-0">
            <span className="text-fg block font-semibold">{initialHintTitle}</span>
            <span className="text-muted mt-1 block">{initialHintText}</span>
          </span>
        </div>
      ) : (
        <>
          {shouldShowDetailHint ? (
            <div className="mg-notice mt-3 text-sm" data-variant="neutral" role="status">
              <span
                className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
                aria-hidden="true"
              >
                <Swords size={14} />
              </span>
              <span className="min-w-0">
                <span className="text-fg block font-semibold">{detailHintTitle}</span>
                <span className="text-muted mt-1 block">{detailHintText}</span>
              </span>
            </div>
          ) : null}

          {hasVersusResults ? (
            <>
              <div className="mg-list divide-border/75 divide-y">
                <div className="mg-row flex-col gap-2 px-1 sm:px-2">
                  <p className="text-muted text-xs font-semibold">Zwischenstand</p>
                  <div className="flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">
                    <span className="bg-surface border-border text-fg inline-flex w-full max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                      <span className="min-w-0 truncate">{playerALabel}</span>
                      <span className="shrink-0">: {versusSummary.winsA}</span>
                    </span>
                    <span className="bg-surface border-border text-fg inline-flex w-full max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold sm:w-auto">
                      <span className="min-w-0 truncate">{playerBLabel}</span>
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
                    <p className="text-muted text-xs">
                      Hinweis: Einige Werte fehlen, wenn ein Spieler keinen Eintrag in der Kategorie
                      hat.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="bg-surface-solid/40 border-border/80 relative mt-3 min-w-0 overflow-hidden rounded-[var(--radius)] border">
                <div className="max-w-full overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[560px] text-sm sm:min-w-[720px]">
                    <caption className="sr-only">
                      Vergleichstabelle f\u00fcr {playerALabel} und {playerBLabel}.
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
                    <tbody className="divide-border divide-y [&>tr>td]:px-2.5 [&>tr>td]:py-2.5 sm:[&>tr>td]:px-4 sm:[&>tr>td]:py-3 [&>tr>th]:px-2.5 [&>tr>th]:py-2.5 sm:[&>tr>th]:px-4 sm:[&>tr>th]:py-3">
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
                        const rowHeaderId = `versus-row-${row.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

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
                              {row.valueA === null ? (
                                <p className="text-muted mt-1 text-xs">{missingHint}</p>
                              ) : null}
                            </td>
                            <td
                              className={winner === 'B' ? 'text-accent font-semibold' : 'text-fg'}
                              headers={`${rowHeaderId} versus-col-player-b`}
                            >
                              {row.valueB === null ? '-' : formatVersusValue(row.valueB, def)}
                              {row.valueB === null ? (
                                <p className="text-muted mt-1 text-xs">{missingHint}</p>
                              ) : null}
                            </td>
                            <td className="text-fg/90" headers={`${rowHeaderId} versus-col-diff`}>
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
                      L\u00e4dt...
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
