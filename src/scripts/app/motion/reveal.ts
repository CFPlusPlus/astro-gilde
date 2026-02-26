const REVEAL_SELECTOR = '[data-motion="reveal"]';
const STAGGER_SELECTOR = '[data-motion-stagger]';

const DEFAULT_STAGGER_STEP = 70;
const INITIAL_VIEWPORT_MIN_DELAY_MS = 120;

const parseMs = (value: string | null | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const applyStaggerDelays = (root: ParentNode): void => {
  const containers = Array.from(root.querySelectorAll<HTMLElement>(STAGGER_SELECTOR));

  containers.forEach((container) => {
    const step = parseMs(container.getAttribute('data-motion-stagger'), DEFAULT_STAGGER_STEP);
    const start = parseMs(container.getAttribute('data-motion-stagger-start'), 0);

    const items = Array.from(container.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.getAttribute('data-motion') === 'reveal',
    );

    items.forEach((item, index) => {
      if (item.hasAttribute('data-motion-delay')) return;
      item.setAttribute('data-motion-delay', String(start + index * step));
    });
  });
};

const revealAll = (elements: HTMLElement[]): void => {
  elements.forEach((el) => el.classList.add('is-motion-in'));
};

const isInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom >= 0 && rect.top <= viewportHeight * 0.92;
};

const collectRevealElements = (root: ParentNode): HTMLElement[] => {
  const result: HTMLElement[] = [];

  if (root instanceof HTMLElement && root.matches(REVEAL_SELECTOR)) {
    result.push(root);
  }

  result.push(...Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)));

  return result;
};

export const initRevealMotion = (root: ParentNode = document): (() => void) => {
  const rootElement = document.documentElement;
  rootElement.classList.add('js-motion');
  rootElement.classList.remove('js-motion-prep');

  applyStaggerDelays(root);

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduce) {
    revealAll(collectRevealElements(root));
    return () => {};
  }

  if (typeof window.IntersectionObserver !== 'function') {
    revealAll(collectRevealElements(root));
    return () => {};
  }

  const observed = new WeakSet<HTMLElement>();
  const scheduledReveal = new WeakSet<HTMLElement>();
  const pendingTimers = new Set<number>();

  const scheduleReveal = (element: HTMLElement, minDelayMs = 0): void => {
    if (scheduledReveal.has(element)) return;
    scheduledReveal.add(element);

    const delay = Math.max(minDelayMs, parseMs(element.getAttribute('data-motion-delay'), 0));
    if (delay === 0) {
      element.classList.add('is-motion-in');
      return;
    }

    const timer = window.setTimeout(() => {
      pendingTimers.delete(timer);
      element.classList.add('is-motion-in');
    }, delay);
    pendingTimers.add(timer);
  };

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (!(entry.target instanceof HTMLElement)) return;

        scheduleReveal(entry.target);
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.01,
      rootMargin: '0px 0px -4% 0px',
    },
  );

  const registerElements = (elements: HTMLElement[]): void => {
    if (elements.length === 0) return;

    elements.forEach((el) => {
      if (observed.has(el)) return;
      if (isInViewport(el)) {
        observed.add(el);
        scheduleReveal(el, INITIAL_VIEWPORT_MIN_DELAY_MS);
        return;
      }
      observed.add(el);
      observer.observe(el);
    });
  };

  registerElements(collectRevealElements(root));

  const mutationRoot =
    root instanceof Document ? root.body : root instanceof HTMLElement ? root : null;

  let mutationObserver: MutationObserver | null = null;
  if (mutationRoot) {
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (node.matches(STAGGER_SELECTOR) || node.querySelector(STAGGER_SELECTOR)) {
            applyStaggerDelays(node);
          }

          registerElements(collectRevealElements(node));
        });
      });
    });

    mutationObserver.observe(mutationRoot, { childList: true, subtree: true });
  }

  return () => {
    observer.disconnect();
    mutationObserver?.disconnect();
    pendingTimers.forEach((timer) => window.clearTimeout(timer));
    pendingTimers.clear();
  };
};
