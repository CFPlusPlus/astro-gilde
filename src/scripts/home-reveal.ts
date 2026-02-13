/* Home-spezifische Reveal-Animation via IntersectionObserver. */

const REVEAL_ROOT_SELECTOR = '[data-home]';
const REVEAL_SELECTOR = '[data-reveal]';

const revealAll = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
    el.classList.add('is-revealed');
  });
};

const initHomeReveal = (): (() => void) => {
  try {
    const root = document.querySelector<HTMLElement>(REVEAL_ROOT_SELECTOR);
    if (!root) return () => {};

    const elements = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (elements.length === 0) return () => {};

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) {
      revealAll(root);
      return () => {};
    }

    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const el = entry.target;
        if (!(el instanceof HTMLElement)) continue;

        el.classList.add('is-revealed');
        observer.unobserve(el);
      }
    };

    const makeObserver = (rootMargin: string): IntersectionObserver =>
      new IntersectionObserver(observerCallback, {
        threshold: 0.12,
        rootMargin,
      });

    let observer: IntersectionObserver;
    try {
      observer = makeObserver('0px 0px -10% 0px');
    } catch {
      observer = makeObserver('0px 0px -120px 0px');
    }

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  } catch {
    try {
      const root = document.querySelector<HTMLElement>(REVEAL_ROOT_SELECTOR);
      if (!root) return () => {};
      revealAll(root);
    } catch {
      // absichtlich leer
    }
    return () => {};
  }
};

let cleanup: (() => void) | null = null;

const mountHomeReveal = (): void => {
  cleanup?.();
  cleanup = initHomeReveal();
};

const unmountHomeReveal = (): void => {
  cleanup?.();
  cleanup = null;
};

mountHomeReveal();
document.addEventListener('astro:before-swap', unmountHomeReveal);
document.addEventListener('astro:page-load', mountHomeReveal);

export {};
