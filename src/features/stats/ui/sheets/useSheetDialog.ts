import { useEffect, useRef, type RefObject } from 'react';

import { lockPageScroll, unlockPageScroll } from '../../../../scripts/app/scroll-lock';

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];

  const selector =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.hasAttribute('disabled')) return false;
    return true;
  });
}

function trapFocus(event: KeyboardEvent, dialogRef: RefObject<HTMLElement | null>): void {
  const focusable = getFocusableElements(dialogRef.current);
  if (focusable.length === 0) {
    event.preventDefault();
    dialogRef.current?.focus();
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

export function useSheetDialog({
  open,
  onClose,
  dialogRef,
  scrollLockId,
  closeAtDesktopMinWidthPx,
}: {
  open: boolean;
  onClose: () => void;
  dialogRef: RefObject<HTMLElement | null>;
  scrollLockId: string;
  closeAtDesktopMinWidthPx?: number;
}) {
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockPageScroll(scrollLockId);

    const focusRaf = window.requestAnimationFrame(() => {
      const focusable = getFocusableElements(dialogRef.current);
      const first = focusable[0];
      if (first) {
        first.focus();
        return;
      }
      dialogRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      trapFocus(event, dialogRef);
    };

    const onResize = () => {
      if (
        typeof closeAtDesktopMinWidthPx === 'number' &&
        window.matchMedia(`(min-width: ${closeAtDesktopMinWidthPx}px)`).matches
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    if (typeof closeAtDesktopMinWidthPx === 'number') {
      window.addEventListener('resize', onResize);
    }

    return () => {
      window.cancelAnimationFrame(focusRaf);
      window.removeEventListener('keydown', onKeyDown);
      if (typeof closeAtDesktopMinWidthPx === 'number') {
        window.removeEventListener('resize', onResize);
      }
      unlockPageScroll(scrollLockId);

      const lastFocusedElement = lastFocusedElementRef.current;
      if (lastFocusedElement && document.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
      }
    };
  }, [closeAtDesktopMinWidthPx, dialogRef, onClose, open, scrollLockId]);
}
