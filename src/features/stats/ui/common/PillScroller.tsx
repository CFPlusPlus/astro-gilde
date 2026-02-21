import { useEffect, useRef, useState, type ReactNode } from 'react';

const HORIZONTAL_SCROLL_EPSILON = 2;

function resolveHorizontalScrollState(container: HTMLDivElement | null): {
  canScrollLeft: boolean;
  canScrollRight: boolean;
} {
  if (!container) {
    return { canScrollLeft: false, canScrollRight: false };
  }

  const maxScrollLeft = container.scrollWidth - container.clientWidth;
  if (maxScrollLeft <= HORIZONTAL_SCROLL_EPSILON) {
    return { canScrollLeft: false, canScrollRight: false };
  }

  return {
    canScrollLeft: container.scrollLeft > HORIZONTAL_SCROLL_EPSILON,
    canScrollRight: container.scrollLeft < maxScrollLeft - HORIZONTAL_SCROLL_EPSILON,
  };
}

export function PillScroller({
  children,
  ariaLabel,
  itemCount,
  fadeEdges = false,
  className,
  listClassName,
}: {
  children: ReactNode;
  ariaLabel?: string;
  itemCount?: number;
  fadeEdges?: boolean;
  className?: string;
  listClassName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const container = scrollerRef.current;
    const update = () => {
      setScrollState(resolveHorizontalScrollState(container));
    };

    update();
    if (!container) return;

    const rafId = window.requestAnimationFrame(update);
    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [itemCount]);

  return (
    <div className={['relative min-w-0', className].filter(Boolean).join(' ')}>
      <div
        ref={scrollerRef}
        className="min-w-0 overflow-x-auto pb-1 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul
          className={['inline-flex w-max items-center gap-2', listClassName]
            .filter(Boolean)
            .join(' ')}
          role="list"
          aria-label={ariaLabel}
        >
          {children}
        </ul>
      </div>

      {fadeEdges && scrollState.canScrollLeft ? (
        <div
          className="from-bg pointer-events-none absolute inset-y-0 left-0 z-[1] w-7 bg-gradient-to-r to-transparent"
          aria-hidden="true"
        />
      ) : null}

      {fadeEdges && scrollState.canScrollRight ? (
        <div
          className="from-bg pointer-events-none absolute inset-y-0 right-0 z-[1] w-7 bg-gradient-to-l to-transparent"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
