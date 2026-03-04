import type { MetricDef } from '../../types';
import { MetricPills } from './MetricPills';

export function QuickAccessPills({
  metrics,
  metricIds,
  activeMetricId,
  onSelectMetric,
}: {
  metrics: Record<string, MetricDef> | null;
  metricIds: string[];
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
}) {
  return (
    <section aria-label="Schnellzugriff">
      <p className="text-fg/90 text-xs font-semibold tracking-wide uppercase">Schnellzugriff</p>

      <div className="mt-2">
        {metrics && metricIds.length > 0 ? (
          <MetricPills
            metrics={metrics}
            metricIds={metricIds}
            activeMetricId={activeMetricId}
            onSelectMetric={onSelectMetric}
            ariaLabel="Schnellzugriff Kategorien"
          />
        ) : (
          <div className="mg-app-chip block h-10 w-full" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}
