import type { MetricDef } from '../../types';
import { MetricPills } from './MetricPills';

export function RecentPills({
  metrics,
  metricIds,
  activeMetricId,
  onSelectMetric,
  onReset,
}: {
  metrics: Record<string, MetricDef>;
  metricIds: string[];
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <section aria-label="Zuletzt angesehen">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-fg/90 min-w-0 truncate text-xs font-semibold tracking-wide uppercase"
          title={'Zuletzt angesehen (dieses Ger\u00e4t)'}
        >
          Zuletzt angesehen (dieses Ger&auml;t)
        </p>
        <button
          type="button"
          onClick={onReset}
          className="focus-visible:ring-offset-bg text-muted hover:text-accent shrink-0 rounded px-0.5 py-0.5 text-[11px] font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Zur&uuml;cksetzen
        </button>
      </div>

      <div className="mt-2">
        <MetricPills
          metrics={metrics}
          metricIds={metricIds}
          activeMetricId={activeMetricId}
          onSelectMetric={onSelectMetric}
          ariaLabel="Zuletzt angesehene Kategorien"
        />
      </div>
    </section>
  );
}
