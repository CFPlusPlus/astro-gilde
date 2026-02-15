import type { ReactNode } from 'react';

type StatsLayoutProps = {
  topBar: ReactNode;
  children: ReactNode;
};

type StatsLayoutSectionProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

function joinClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function StatsLayout({ topBar, children }: StatsLayoutProps) {
  return (
    <div className="pb-12">
      <section className="mg-surface-1">
        <div className="mg-container py-8">{topBar}</div>
      </section>
      <section className="mg-container py-8">{children}</section>
    </div>
  );
}

export function StatsLayoutGrid({ children, className }: StatsLayoutSectionProps) {
  return (
    <div className={joinClassNames('grid gap-6 lg:grid-cols-12 lg:items-start', className)}>
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
