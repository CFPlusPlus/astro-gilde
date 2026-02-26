import { resolveStatsCategoryDef } from '../../statsCategories';
import type { MetricDef } from '../../types';
import { PillScroller } from '../../ui/common/PillScroller';

export function MetricPills({
  metrics,
  metricIds,
  activeMetricId,
  onSelectMetric,
  ariaLabel,
}: {
  metrics: Record<string, MetricDef>;
  metricIds: string[];
  activeMetricId: string | null;
  onSelectMetric: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <PillScroller
      ariaLabel={ariaLabel}
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
  );
}
