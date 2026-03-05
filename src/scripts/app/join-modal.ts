import type { Qs, Qsa } from './dom';
import { getFocusableElements, trapFocusInContainer } from './dialog';
import { lockPageScroll, unlockPageScroll } from './scroll-lock';
import type { ShowToast } from './toast';

export const initJoinModal = ({
  config,
  qs,
  qsa,
  showToast,
  closeMenu,
  isMenuOpen,
}: {
  config: BrowserAppConfig;
  qs: Qs;
  qsa: Qsa;
  showToast: ShowToast;
  closeMenu: () => void;
  isMenuOpen: () => boolean;
}): (() => void) => {
  const JOIN_MODAL_SCROLL_LOCK_ID = 'join-modal';
  const cleanup: Array<() => void> = [];
  const pendingTimers = new Set<number>();

  const addListener = <T extends EventTarget>(
    target: T,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    target.addEventListener(type, listener, options);
    cleanup.push(() => {
      target.removeEventListener(type, listener, options);
    });
  };

  const fallbackCopy = (text: string): boolean => {
    try {
      const result = window.prompt('Server-IP kopieren:', text);
      return result !== null;
    } catch {
      return false;
    }
  };

  const copyIp = async (opts?: { silentSuccess?: boolean }): Promise<boolean> => {
    const { silentSuccess = false } = opts ?? {};
    const ip = config.serverIp;
    if (!ip) {
      showToast('Server-IP nicht verfügbar.', 'error');
      return false;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ip);
      } else {
        const ok = fallbackCopy(ip);
        if (!ok) throw new Error('Clipboard API nicht verfügbar');
      }
      if (!silentSuccess) showToast('IP kopiert!');
      return true;
    } catch (e) {
      console.warn('Copy-IP Fehler:', e);
      showToast('Kopieren nicht möglich.', 'error');
      return false;
    }
  };

  const joinModalRoot = qs<HTMLElement>('[data-join-modal]');
  const joinModalDialog = qs<HTMLElement>('[data-join-modal-dialog]', joinModalRoot ?? document);
  const joinModalOverlay = qs<HTMLElement>('[data-join-modal-overlay]', joinModalRoot ?? document);
  const joinModalCloseButtons = qsa<HTMLElement>(
    '[data-join-modal-close]',
    joinModalRoot ?? document,
  );
  const joinModalCopyButtons = qsa<HTMLElement>('[data-copy-ip-modal]', joinModalRoot ?? document);
  const joinModalCopyFeedbackTimers = new WeakMap<HTMLElement, number>();
  const inlineCopyButtons = qsa<HTMLElement>('[data-copy-ip-inline]');
  const inlineCopyFeedbackTimers = new WeakMap<HTMLElement, number>();
  const joinTriggerButtons = qsa<HTMLElement>('[data-copy-ip]');

  let modalLastFocusedEl: HTMLElement | null = null;

  const isJoinModalOpen = (): boolean =>
    Boolean(joinModalRoot && !joinModalRoot.classList.contains('hidden'));

  const closeJoinModal = (): void => {
    if (!joinModalRoot || !isJoinModalOpen()) return;

    joinModalRoot.classList.add('hidden');
    joinModalRoot.setAttribute('aria-hidden', 'true');
    unlockPageScroll(JOIN_MODAL_SCROLL_LOCK_ID);

    if (modalLastFocusedEl && document.contains(modalLastFocusedEl)) {
      modalLastFocusedEl.focus();
    }
  };

  const openJoinModal = (): void => {
    if (!joinModalRoot || !joinModalDialog || isJoinModalOpen()) return;

    modalLastFocusedEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    joinModalRoot.classList.remove('hidden');
    joinModalRoot.setAttribute('aria-hidden', 'false');
    lockPageScroll(JOIN_MODAL_SCROLL_LOCK_ID);

    const timer = window.setTimeout(() => {
      pendingTimers.delete(timer);
      const focusTarget = getFocusableElements(joinModalDialog)[0] ?? joinModalDialog;
      focusTarget.focus();
    }, 0);
    pendingTimers.add(timer);
  };

  const trapJoinModalFocus = (e: KeyboardEvent): void => {
    if (!joinModalDialog || !isJoinModalOpen() || e.key !== 'Tab') return;
    trapFocusInContainer(e, joinModalDialog);
  };

  if (!joinModalRoot && joinTriggerButtons.length === 0 && inlineCopyButtons.length === 0) {
    return () => {};
  }

  const onOverlayClick: EventListener = (): void => closeJoinModal();
  if (joinModalOverlay) addListener(joinModalOverlay, 'click', onOverlayClick);

  const onCloseClick: EventListener = (): void => closeJoinModal();
  joinModalCloseButtons.forEach((btn) => {
    addListener(btn, 'click', onCloseClick);
  });

  const setModalCopyButtonState = (btn: HTMLElement, copied: boolean): void => {
    const stateDefault = qs<HTMLElement>('[data-copy-ip-modal-state-default]', btn);
    const stateSuccess = qs<HTMLElement>('[data-copy-ip-modal-state-success]', btn);

    if (copied) btn.dataset.copied = 'true';
    else delete btn.dataset.copied;

    if (stateDefault) stateDefault.classList.toggle('opacity-0', copied);
    if (stateSuccess) stateSuccess.classList.toggle('opacity-0', !copied);

    btn.setAttribute('aria-label', copied ? 'Server-IP wurde kopiert' : 'Server-IP kopieren');
  };

  const flashModalCopyButton = (btn: HTMLElement): void => {
    const runningTimer = joinModalCopyFeedbackTimers.get(btn);
    if (runningTimer != null) {
      window.clearTimeout(runningTimer);
      pendingTimers.delete(runningTimer);
    }

    setModalCopyButtonState(btn, true);

    const timer = window.setTimeout(() => {
      pendingTimers.delete(timer);
      setModalCopyButtonState(btn, false);
      joinModalCopyFeedbackTimers.delete(btn);
    }, 1600);
    pendingTimers.add(timer);
    joinModalCopyFeedbackTimers.set(btn, timer);
  };

  joinModalCopyButtons.forEach((btn) => {
    const onModalCopyClick: EventListener = (event): void => {
      const e = event as MouseEvent;
      e.preventDefault();
      void (async () => {
        const ok = await copyIp({ silentSuccess: true });
        if (ok) flashModalCopyButton(btn);
      })();
    };
    addListener(btn, 'click', onModalCopyClick);
  });

  const setInlineCopyButtonState = (btn: HTMLElement, copied: boolean): void => {
    const labelDefault = qs<HTMLElement>('[data-copy-ip-inline-label-default]', btn);
    const labelSuccess = qs<HTMLElement>('[data-copy-ip-inline-label-success]', btn);

    if (copied) btn.dataset.copied = 'true';
    else delete btn.dataset.copied;

    if (labelDefault) labelDefault.classList.toggle('opacity-0', copied);
    if (labelSuccess) labelSuccess.classList.toggle('opacity-0', !copied);

    btn.setAttribute('aria-label', copied ? 'Server-IP wurde kopiert' : 'Server-IP kopieren');
  };

  const flashInlineCopyButton = (btn: HTMLElement): void => {
    const runningTimer = inlineCopyFeedbackTimers.get(btn);
    if (runningTimer != null) {
      window.clearTimeout(runningTimer);
      pendingTimers.delete(runningTimer);
    }

    setInlineCopyButtonState(btn, true);

    const timer = window.setTimeout(() => {
      pendingTimers.delete(timer);
      setInlineCopyButtonState(btn, false);
      inlineCopyFeedbackTimers.delete(btn);
    }, 1600);
    pendingTimers.add(timer);
    inlineCopyFeedbackTimers.set(btn, timer);
  };

  inlineCopyButtons.forEach((btn) => {
    const onInlineCopyClick: EventListener = (event): void => {
      const e = event as MouseEvent;
      e.preventDefault();
      void (async () => {
        const ok = await copyIp({ silentSuccess: true });
        if (ok) flashInlineCopyButton(btn);
      })();
    };
    addListener(btn, 'click', onInlineCopyClick);
  });

  const onDocumentKeydown: EventListener = (event): void => {
    const e = event as KeyboardEvent;
    if (e.key === 'Escape') {
      if (isJoinModalOpen()) {
        e.preventDefault();
        closeJoinModal();
        return;
      }

      if (isMenuOpen()) closeMenu();
      return;
    }

    trapJoinModalFocus(e);
  };
  addListener(document, 'keydown', onDocumentKeydown);

  joinTriggerButtons.forEach((btn) => {
    const onJoinTriggerClick: EventListener = (event): void => {
      const e = event as MouseEvent;
      e.preventDefault();
      closeMenu();
      openJoinModal();
    };
    addListener(btn, 'click', onJoinTriggerClick);
  });

  return () => {
    closeJoinModal();

    pendingTimers.forEach((timer) => {
      window.clearTimeout(timer);
    });
    pendingTimers.clear();

    while (cleanup.length > 0) {
      const stop = cleanup.pop();
      stop?.();
    }
  };
};
