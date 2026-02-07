import { useMemo, type ReactNode } from 'react';
import { Clock, Map as MapIcon, Skull, Sparkles, Swords, X } from 'lucide-react';

import { KPI_FALLBACK_DEFS, KPI_METRICS } from '../../constants';
import { formatMetricValue } from '../../format';
import { KpiStrip, type KpiItem } from '../KpiStrip';
import { SectionTitle } from '../StatsPrimitives';

export function OverviewSection({
  showWelcome,
  onDismissWelcome,
  totals,
}: {
  showWelcome: boolean;
  onDismissWelcome: () => void;
  totals: Record<string, number> | null;
}) {
  const kpiIcons = useMemo<Record<string, ReactNode>>(
    () => ({
      hours: <Clock size={16} />,
      distance: <MapIcon size={16} />,
      mob_kills: <Swords size={16} />,
      creeper: <Skull size={16} />,
    }),
    [],
  );

  const kpiItems = useMemo<KpiItem[]>(() => {
    return KPI_METRICS.map((id) => {
      const def = KPI_FALLBACK_DEFS[id];
      const value = totals?.[id];
      return {
        id,
        icon: kpiIcons[id],
        label: def.label,
        value: typeof value === 'number' ? formatMetricValue(value, def) : '-',
      };
    });
  }, [kpiIcons, totals]);

  return (
    <section aria-label="&Uuml;bersicht" className="mg-container pb-12">
      {showWelcome ? (
        <div className="mg-callout relative flex items-start gap-3" data-variant="info">
          <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-fg font-semibold">Willkommen auf der Statistik-Seite!</p>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Nutze die Suche oben, um direkt zur Spielerstatistik zu springen. In den Ranglisten
              findest du die Top-Werte je Kategorie, von Spielzeit &uuml;ber Distanz bis zu
              Kreaturen.
            </p>
          </div>
          <button
            type="button"
            className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
            aria-label="Schlie&szlig;en"
            onClick={onDismissWelcome}
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

      <div className="mt-8">
        <SectionTitle
          title="Die Geschichte unserer Welt - in Zahlen"
          subtitle="Von langen Reisen &uuml;ber gef&auml;hrliche N&auml;chte bis zu gro&szlig;en Projekten: Hier siehst du den Puls des Servers."
        />
      </div>

      <div aria-live="polite" className="mt-5">
        <KpiStrip items={kpiItems} variant="inline" />
      </div>
    </section>
  );
}
