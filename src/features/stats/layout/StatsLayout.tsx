import { useEffect, useRef, useState, type ReactNode } from 'react';

type StatsLayoutProps = {
  topBar: ReactNode;
  children: ReactNode;
  topBarClassName?: string;
  contentClassName?: string;
  stickyTopBar?: boolean;
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

const STICKY_OFFSET_MAX_PX = 400;

function resolveStickyOffsetPx(offsetPx: number): number {
  return Math.max(0, Math.min(STICKY_OFFSET_MAX_PX, Math.round(offsetPx)));
}

export function StatsLayout({
  topBar,
  children,
  topBarClassName,
  contentClassName,
  stickyTopBar = false,
}: StatsLayoutProps) {
  const stickyTopBarRef = useRef<HTMLElement | null>(null);
  const [stickyContentTopPx, setStickyContentTopPx] = useState(0);

  useEffect(() => {
    if (!stickyTopBar) {
      setStickyContentTopPx(0);
      return;
    }

    const element = stickyTopBarRef.current;
    if (!element) return;

    const updateOffset = () => {
      const top = Number.parseFloat(window.getComputedStyle(element).top || '0') || 0;
      const height = element.getBoundingClientRect().height;
      const offset = Math.max(0, top + height);
      setStickyContentTopPx(resolveStickyOffsetPx(offset));
    };

    updateOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateOffset();
    });
    resizeObserver.observe(element);
    window.addEventListener('resize', updateOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, [stickyTopBar]);

  const stickyContentTopHundreds = Math.trunc(stickyContentTopPx / 100);
  const stickyContentTopTens = Math.trunc((stickyContentTopPx % 100) / 10);
  const stickyContentTopOnes = stickyContentTopPx % 10;

  return (
    <div
      className="mg-stats-layout pb-12"
      data-stats-sticky-top-hundreds={stickyContentTopHundreds}
      data-stats-sticky-top-tens={stickyContentTopTens}
      data-stats-sticky-top-ones={stickyContentTopOnes}
    >
      <section
        ref={stickyTopBarRef}
        className={joinClassNames(
          'mg-surface-1',
          stickyTopBar
            ? 'border-border/70 sticky top-[calc(4rem+env(safe-area-inset-top))] z-40 border-b'
            : undefined,
        )}
      >
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
