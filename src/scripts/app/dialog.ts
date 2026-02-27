const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: ParentNode | null): HTMLElement[] {
  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.hasAttribute('disabled')) return false;
    return true;
  });
}

export function trapFocusInContainer(event: KeyboardEvent, container: HTMLElement | null): void {
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    container?.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
