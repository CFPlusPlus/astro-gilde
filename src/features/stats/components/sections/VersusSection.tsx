import {
  VersusMetricPicker,
  VersusPlayerPicker,
  VersusResults,
  type VersusSectionProps,
} from '../versus';
import { StatsLayoutGrid, StatsLayoutMain } from '../../layout/StatsLayout';
import { SectionTitle } from '../StatsPrimitives';

export function VersusSection(props: VersusSectionProps) {
  return (
    <StatsLayoutGrid className="[overflow-anchor:none]">
      <StatsLayoutMain ariaLabel="Versus Vergleich" className="lg:col-span-12">
        <SectionTitle title="Versus" subtitle="Vergleiche zwei Spieler direkt nebeneinander." />

        <div className="mt-5 space-y-5">
          <section>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-fg text-sm font-semibold">Spielerauswahl</h3>
              <span className="text-muted text-xs">
                Definiere Spieler A und B für den Vergleich.
              </span>
            </div>
            <VersusPlayerPicker {...props} surface={false} />
          </section>

          <section className="space-y-5">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-fg text-sm font-semibold">Kategorien</h3>
                <span className="text-muted text-xs">
                  Wähle aus, was im Vergleich gezeigt wird.
                </span>
              </div>
              <VersusMetricPicker {...props} surface={false} />
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-fg text-sm font-semibold">Ergebnis</h3>
                <span className="text-muted text-xs">Zwischenstand und Detailvergleich.</span>
              </div>
              <VersusResults {...props} surface={false} />
            </div>
          </section>
        </div>
      </StatsLayoutMain>
    </StatsLayoutGrid>
  );
}
