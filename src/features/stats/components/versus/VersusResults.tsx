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
>;

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
}: VersusResultsProps) {
  return (
    <div className="min-w-0 space-y-3">
      {versusLoading ? (
        <div className="mg-card p-4">
          <p className="text-fg font-semibold">Spielerstatistiken werden geladen...</p>
          <p className="text-muted mt-1 text-sm">
            Je mehr Daten vorhanden sind, desto l&auml;nger dauert der Vergleich.
          </p>
        </div>
      ) : null}

      {!versusPlayerA || !versusPlayerB ? (
        <div className="mg-card p-6">
          <p className="text-fg font-semibold">Bitte zwei Spieler w&auml;hlen</p>
          <p className="text-muted mt-2 text-sm">
            Nutze die Suche oben, um Spieler A und B auszuw&auml;hlen.
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
          <p className="text-fg font-semibold">Keine Kategorien ausgew&auml;hlt</p>
          <p className="text-muted mt-2 text-sm">
            W&auml;hle links die Kategorien aus, die du vergleichen m&ouml;chtest.
          </p>
        </div>
      ) : !hasVersusResults ? (
        <div className="mg-card p-6">
          <p className="text-fg font-semibold">Vergleich bereit</p>
          <p className="text-muted mt-2 text-sm">
            W&auml;hle Kategorien aus, um die Werte zu sehen.
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
                Hinweis: Einige Werte fehlen, wenn ein Spieler keinen Eintrag in der Kategorie hat.
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
                      row.valueA === null || row.valueB === null ? null : row.valueA - row.valueB;
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
                        <td className={winner === 'A' ? 'text-accent font-semibold' : 'text-fg'}>
                          {row.valueA === null ? '-' : formatVersusValue(row.valueA, def)}
                          {row.valueA === null ? (
                            <p className="text-muted mt-1 text-xs">{missingHint}</p>
                          ) : null}
                        </td>
                        <td className={winner === 'B' ? 'text-accent font-semibold' : 'text-fg'}>
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
                  L&auml;dt...
                </span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
