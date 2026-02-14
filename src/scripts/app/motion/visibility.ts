const DEFAULT_DURATION_MS = 170;
const HIDE_CLASS = 'is-filter-hiding';
const ENTER_CLASS = 'is-filter-enter';
const ENTER_ACTIVE_CLASS = 'is-filter-enter-active';

const hideTimers = new WeakMap<HTMLElement, number>();
const enterTimers = new WeakMap<HTMLElement, number>();

const clearTimer = (store: WeakMap<HTMLElement, number>, el: HTMLElement): void => {
  const timer = store.get(el);
  if (typeof timer !== 'number') return;
  window.clearTimeout(timer);
  store.delete(el);
};

export const setSoftVisibility = (
  el: HTMLElement,
  visible: boolean,
  durationMs = DEFAULT_DURATION_MS,
): void => {
  clearTimer(hideTimers, el);
  clearTimer(enterTimers, el);

  if (visible) {
    const wasHidden = el.classList.contains('hidden');

    el.classList.remove('hidden');
    el.classList.remove(HIDE_CLASS);

    if (!wasHidden) return;

    el.classList.add(ENTER_CLASS);
    requestAnimationFrame(() => {
      el.classList.add(ENTER_ACTIVE_CLASS);
    });

    const timer = window.setTimeout(() => {
      el.classList.remove(ENTER_CLASS);
      el.classList.remove(ENTER_ACTIVE_CLASS);
      enterTimers.delete(el);
    }, durationMs + 30);

    enterTimers.set(el, timer);
    return;
  }

  if (el.classList.contains('hidden')) return;

  el.classList.remove(ENTER_CLASS);
  el.classList.remove(ENTER_ACTIVE_CLASS);
  el.classList.add(HIDE_CLASS);

  const timer = window.setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove(HIDE_CLASS);
    hideTimers.delete(el);
  }, durationMs);

  hideTimers.set(el, timer);
};
