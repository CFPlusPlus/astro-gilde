import { useEffect, useRef, type RefObject } from 'react';

import { getFocusableElements, trapFocusInContainer } from '../../../../scripts/app/dialog';
import { lockPageScroll, unlockPageScroll } from '../../../../scripts/app/scroll-lock';

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
      trapFocusInContainer(event, dialogRef.current);
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
