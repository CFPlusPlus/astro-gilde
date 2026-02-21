const ACCORDION_SELECTOR = '.mg-accordion, [data-motion-accordion]';
const ACCORDION_CONTENT_ATTR = 'data-motion-accordion-content';
const ACCORDION_DURATION_MS = 220;
const ACCORDION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

type AccordionState = 'opening' | 'closing' | '';
type ActiveAnimation = { animation: Animation; fallbackTimer: number };

const activeAnimations = new WeakMap<HTMLDetailsElement, ActiveAnimation>();

const getSummaryElement = (details: HTMLDetailsElement): HTMLElement | null => {
  const first = details.firstElementChild;
  if (first instanceof HTMLElement && first.tagName.toLowerCase() === 'summary') {
    return first;
  }

  return details.querySelector<HTMLElement>('summary');
};

const getContentElement = (details: HTMLDetailsElement, summary: HTMLElement): HTMLElement => {
  const existing = details.querySelector<HTMLElement>(`[${ACCORDION_CONTENT_ATTR}]`);
  if (existing) return existing;

  const content = document.createElement('div');
  content.setAttribute(ACCORDION_CONTENT_ATTR, '');

  let cursor = summary.nextSibling;
  while (cursor) {
    const next = cursor.nextSibling;
    content.appendChild(cursor);
    cursor = next;
  }

  details.appendChild(content);
  return content;
};

const setAccordionState = (details: HTMLDetailsElement, state: AccordionState): void => {
  if (!state) {
    details.removeAttribute('data-motion-state');
    return;
  }
  details.setAttribute('data-motion-state', state);
};

const setupInitialState = (details: HTMLDetailsElement, content: HTMLElement): void => {
  content.hidden = !details.open;
};

const clearActiveAnimation = (details: HTMLDetailsElement): void => {
  const active = activeAnimations.get(details);
  if (!active) return;
  window.clearTimeout(active.fallbackTimer);
  active.animation.cancel();
  activeAnimations.delete(details);
};

const runAccordionAnimation = ({
  details,
  content,
  state,
  keyframes,
  onFinish,
}: {
  details: HTMLDetailsElement;
  content: HTMLElement;
  state: AccordionState;
  keyframes: Keyframe[];
  onFinish: () => void;
}): void => {
  clearActiveAnimation(details);
  setAccordionState(details, state);

  if (typeof content.animate !== 'function') {
    setAccordionState(details, '');
    onFinish();
    return;
  }

  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    const active = activeAnimations.get(details);
    if (active) {
      window.clearTimeout(active.fallbackTimer);
      activeAnimations.delete(details);
    }
    onFinish();
  };

  const animation = content.animate(keyframes, {
    duration: ACCORDION_DURATION_MS,
    easing: ACCORDION_EASING,
    fill: 'none',
  });

  const fallbackTimer = window.setTimeout(finish, ACCORDION_DURATION_MS + 80);
  activeAnimations.set(details, { animation, fallbackTimer });

  animation.addEventListener('finish', finish, { once: true });
  animation.addEventListener(
    'cancel',
    () => {
      const active = activeAnimations.get(details);
      if (!active || active.animation !== animation) return;
      window.clearTimeout(active.fallbackTimer);
      activeAnimations.delete(details);
    },
    { once: true },
  );
};

const animateOpen = (details: HTMLDetailsElement, content: HTMLElement): void => {
  details.open = true;
  content.hidden = false;

  const targetHeight = Math.max(content.scrollHeight, 1);
  runAccordionAnimation({
    details,
    content,
    state: 'opening',
    keyframes: [
      { height: '0px', opacity: 0 },
      { height: `${targetHeight}px`, opacity: 1 },
    ],
    onFinish: () => {
      setAccordionState(details, '');
    },
  });
};

const animateClose = (details: HTMLDetailsElement, content: HTMLElement): void => {
  const startSize = Math.max(content.getBoundingClientRect().height, content.scrollHeight, 1);
  content.hidden = false;
  runAccordionAnimation({
    details,
    content,
    state: 'closing',
    keyframes: [
      { height: `${startSize}px`, opacity: 1 },
      { height: '0px', opacity: 0 },
    ],
    onFinish: () => {
      details.open = false;
      content.hidden = true;
      setAccordionState(details, '');
    },
  });
};

export const initAccordionMotion = (root: ParentNode = document): (() => void) => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduce) return () => {};

  const detailsList = Array.from(root.querySelectorAll<HTMLDetailsElement>(ACCORDION_SELECTOR));
  if (detailsList.length === 0) return () => {};

  const cleanup: Array<() => void> = [];

  detailsList.forEach((details) => {
    const summary = getSummaryElement(details);
    if (!summary) return;

    details.setAttribute('data-motion-accordion', 'true');

    const content = getContentElement(details, summary);
    setupInitialState(details, content);

    const onToggle = (): void => {
      if (details.hasAttribute('data-motion-state')) return;
      setupInitialState(details, content);
    };

    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (details.getAttribute('data-motion-state')) return;

      event.preventDefault();

      if (details.open) {
        animateClose(details, content);
      } else {
        animateOpen(details, content);
      }
    };

    summary.addEventListener('click', onClick);
    details.addEventListener('toggle', onToggle);

    cleanup.push(() => {
      summary.removeEventListener('click', onClick);
      details.removeEventListener('toggle', onToggle);
    });
  });

  return () => {
    detailsList.forEach((details) => clearActiveAnimation(details));
    cleanup.forEach((fn) => fn());
  };
};
