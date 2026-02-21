import { resolveStatsCategoryDef } from '../../statsCategories';
import type { MetricDef } from '../../types';
import { PillScroller } from '../../ui/common/PillScroller';

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
          <PillScroller
            ariaLabel="Schnellzugriff Kategorien"
            itemCount={metricIds.length}
            fadeEdges
            listClassName="translate-y-[2px]"
          >
            {metricIds.map((id) => {
              const categoryDef = resolveStatsCategoryDef(id, metrics[id]);
              const isActive = id === activeMetricId;

              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelectMetric(id)}
                    className={[
                      'mg-pill h-8 px-3 text-xs leading-none font-semibold whitespace-nowrap',
                      isActive
                        ? 'border-accent/55 bg-accent/18 text-fg hover:bg-accent/30'
                        : 'border-border/80 bg-surface-solid/35 hover:border-accent/45 hover:bg-accent/14 hover:text-fg',
                    ].join(' ')}
                    aria-pressed={isActive}
                  >
                    {categoryDef.label || id}
                  </button>
                </li>
              );
            })}
          </PillScroller>
        ) : (
          <div
            className="bg-surface-solid/35 border-border/70 h-10 rounded-full border"
            aria-hidden="true"
          />
        )}
      </div>
    </section>
  );
}
