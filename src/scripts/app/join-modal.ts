import type { Qs, Qsa } from './dom';
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
}): void => {
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
      showToast('Server-IP nicht verfuegbar.', 'error');
      return false;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ip);
      } else {
        const ok = fallbackCopy(ip);
        if (!ok) throw new Error('Clipboard API nicht verfuegbar');
      }
      if (!silentSuccess) showToast('IP kopiert!');
      return true;
    } catch (e) {
      console.warn('Copy-IP Fehler:', e);
      showToast('Kopieren nicht moeglich.', 'error');
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

  let modalLastFocusedEl: HTMLElement | null = null;
  let bodyOverflowBeforeModal = '';

  const isJoinModalOpen = (): boolean =>
    Boolean(joinModalRoot && !joinModalRoot.classList.contains('hidden'));

  const getJoinModalFocusable = (): HTMLElement[] => {
    if (!joinModalDialog) return [];

    return qsa<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
      joinModalDialog,
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  };

  const closeJoinModal = (): void => {
    if (!joinModalRoot || !isJoinModalOpen()) return;

    joinModalRoot.classList.add('hidden');
    joinModalRoot.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = bodyOverflowBeforeModal;

    if (modalLastFocusedEl && document.contains(modalLastFocusedEl)) {
      modalLastFocusedEl.focus();
    }
  };

  const openJoinModal = (): void => {
    if (!joinModalRoot || !joinModalDialog || isJoinModalOpen()) return;

    modalLastFocusedEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    bodyOverflowBeforeModal = document.body.style.overflow;

    joinModalRoot.classList.remove('hidden');
    joinModalRoot.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      const focusTarget = getJoinModalFocusable()[0] ?? joinModalDialog;
      focusTarget.focus();
    }, 0);
  };

  const trapJoinModalFocus = (e: KeyboardEvent): void => {
    if (!joinModalDialog || !isJoinModalOpen() || e.key !== 'Tab') return;

    const focusable = getJoinModalFocusable();
    if (!focusable.length) {
      e.preventDefault();
      joinModalDialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (joinModalOverlay) {
    joinModalOverlay.addEventListener('click', () => closeJoinModal());
  }

  joinModalCloseButtons.forEach((btn) => {
    btn.addEventListener('click', () => closeJoinModal());
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
    if (runningTimer != null) window.clearTimeout(runningTimer);

    setModalCopyButtonState(btn, true);

    const timer = window.setTimeout(() => {
      setModalCopyButtonState(btn, false);
      joinModalCopyFeedbackTimers.delete(btn);
    }, 1600);
    joinModalCopyFeedbackTimers.set(btn, timer);
  };

  joinModalCopyButtons.forEach((btn) => {
    btn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      const ok = await copyIp({ silentSuccess: true });
      if (ok) flashModalCopyButton(btn);
    });
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
    if (runningTimer != null) window.clearTimeout(runningTimer);

    setInlineCopyButtonState(btn, true);

    const timer = window.setTimeout(() => {
      setInlineCopyButtonState(btn, false);
      inlineCopyFeedbackTimers.delete(btn);
    }, 1600);
    inlineCopyFeedbackTimers.set(btn, timer);
  };

  inlineCopyButtons.forEach((btn) => {
    btn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      const ok = await copyIp({ silentSuccess: true });
      if (ok) flashInlineCopyButton(btn);
    });
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
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
  });

  qsa<HTMLElement>('[data-copy-ip]').forEach((btn) => {
    btn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      closeMenu();
      openJoinModal();
    });
  });
};
