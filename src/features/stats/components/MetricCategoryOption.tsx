type MetricCategoryOptionProps = {
  id: string;
  label: string;
  unit?: string | null;
  isActive: boolean;
  onSelect: () => void;
  size?: 'default' | 'compact';
  activeClassName: string;
  inactiveClassName: string;
};

export function MetricCategoryOption({
  id,
  label,
  unit,
  isActive,
  onSelect,
  size = 'default',
  activeClassName,
  inactiveClassName,
}: MetricCategoryOptionProps) {
  const sizeClassName =
    size === 'compact'
      ? 'group relative w-full px-2.5 py-2.5 text-left text-sm font-semibold transition-colors sm:px-3.5 sm:py-3'
      : 'group relative w-full px-2.5 py-2.5 text-left text-sm font-semibold transition-colors sm:px-4 sm:py-3';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        sizeClassName,
        'focus-visible:ring-offset-bg focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none',
        isActive ? activeClassName : inactiveClassName,
      ].join(' ')}
      data-active={isActive ? 'true' : 'false'}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            'mt-0.5 h-4 w-1 flex-none rounded-full transition-colors',
            isActive ? 'bg-accent' : 'group-hover:bg-accent/35 bg-transparent',
          ].join(' ')}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {unit ? (
              <span className="text-muted mt-0.5 text-xs font-semibold whitespace-nowrap">
                {unit}
              </span>
            ) : null}
          </span>
          <span className="text-muted mt-1 block text-xs break-all">ID: {id}</span>
        </span>
      </div>
    </button>
  );
}
