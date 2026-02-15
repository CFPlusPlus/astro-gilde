import type { ReactNode } from 'react';

type StatsLayoutProps = {
  topBar: ReactNode;
  children: ReactNode;
  topBarClassName?: string;
  contentClassName?: string;
};

type StatsLayoutSectionProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

type StatsLayoutGridProps = {
  children: ReactNode;
  className?: string;
  stackUntilXl?: boolean;
};

function joinClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function StatsLayout({
  topBar,
  children,
  topBarClassName,
  contentClassName,
}: StatsLayoutProps) {
  return (
    <div className="pb-12">
      <section className="mg-surface-1">
        <div className={joinClassNames('mg-container py-8', topBarClassName)}>{topBar}</div>
      </section>
      <section className={joinClassNames('mg-container py-8', contentClassName)}>
        {children}
      </section>
    </div>
  );
}

export function StatsLayoutGrid({
  children,
  className,
  stackUntilXl = false,
}: StatsLayoutGridProps) {
  return (
    <div
      className={joinClassNames(
        stackUntilXl
          ? 'grid gap-6 xl:grid-cols-12 xl:items-start'
          : 'grid gap-6 lg:grid-cols-12 lg:items-start',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatsLayoutRail({ children, className, ariaLabel }: StatsLayoutSectionProps) {
  return (
    <aside
      className={joinClassNames('mg-surface-2 min-w-0 p-4 sm:p-5 lg:col-span-4', className)}
      aria-label={ariaLabel}
    >
      {children}
    </aside>
  );
}

export function StatsLayoutMain({ children, className, ariaLabel }: StatsLayoutSectionProps) {
  return (
    <section
      className={joinClassNames('mg-surface-2 min-w-0 p-4 sm:p-5 lg:col-span-8', className)}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  );
}
