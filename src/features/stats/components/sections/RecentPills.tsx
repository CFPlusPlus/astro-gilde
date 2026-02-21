import { resolveStatsCategoryDef } from '../../statsCategories';
import type { MetricDef } from '../../types';
import { PillScroller } from '../../ui/common/PillScroller';

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
        <PillScroller
          ariaLabel="Zuletzt angesehene Kategorien"
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
      </div>
    </section>
  );
}
