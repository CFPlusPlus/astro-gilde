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

  let joinModalRoot: HTMLElement | null = null;
  let joinModalDialog: HTMLElement | null = null;
  let joinModalOverlay: HTMLElement | null = null;
  let joinModalCloseButtons: HTMLElement[] = [];
  let joinModalCopyButtons: HTMLElement[] = [];
  let joinModalMountPromise: Promise<void> | null = null;
  const joinModalCopyFeedbackTimers = new Map<HTMLElement, number>();
  const inlineCopyButtons = qsa<HTMLElement>('[data-copy-ip-inline]');
  const inlineCopyFeedbackTimers = new WeakMap<HTMLElement, number>();
  const modalSupportsInert = 'inert' in HTMLElement.prototype;
  const modalBackgroundFallbackState = new WeakMap<
    HTMLElement,
    { ariaHidden: string | null; hadPointerEventsNone: boolean }
  >();

  let modalLastFocusedEl: HTMLElement | null = null;
  let bodyOverflowBeforeModal = '';

  const ensureJoinModalPortalRoot = (): HTMLElement => {
    const existingRoot = document.getElementById('join-modal-root');
    if (existingRoot instanceof HTMLElement) return existingRoot;

    const createdRoot = document.createElement('div');
    createdRoot.id = 'join-modal-root';
    document.body.append(createdRoot);
    return createdRoot;
  };

  const getModalBackgroundTargets = (): HTMLElement[] => {
    const portalRoot = ensureJoinModalPortalRoot();
    return Array.from(document.body.children).filter((child): child is HTMLElement => {
      if (!(child instanceof HTMLElement)) return false;
      return child !== portalRoot && !child.contains(portalRoot);
    });
  };

  const setModalBackgroundInert = (inert: boolean): void => {
    const targets = getModalBackgroundTargets();

    if (modalSupportsInert) {
      targets.forEach((el) => {
        (el as HTMLElement & { inert: boolean }).inert = inert;
      });
      return;
    }

    if (inert) {
      targets.forEach((el) => {
        if (!modalBackgroundFallbackState.has(el)) {
          modalBackgroundFallbackState.set(el, {
            ariaHidden: el.getAttribute('aria-hidden'),
            hadPointerEventsNone: el.classList.contains('pointer-events-none'),
          });
        }

        el.setAttribute('aria-hidden', 'true');
        if (!el.classList.contains('pointer-events-none')) {
          el.classList.add('pointer-events-none');
        }
      });
      return;
    }

    targets.forEach((el) => {
      const prevState = modalBackgroundFallbackState.get(el);
      if (!prevState) return;

      if (prevState.ariaHidden === null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', prevState.ariaHidden);

      if (!prevState.hadPointerEventsNone) {
        el.classList.remove('pointer-events-none');
      }
      modalBackgroundFallbackState.delete(el);
    });
  };

  const clearJoinModalRefs = (): void => {
    joinModalRoot = null;
    joinModalDialog = null;
    joinModalOverlay = null;
    joinModalCloseButtons = [];
    joinModalCopyButtons = [];
  };

  const isJoinModalOpen = (): boolean => Boolean(joinModalRoot);

  const getJoinModalFocusable = (): HTMLElement[] => {
    if (!joinModalDialog) return [];

    return qsa<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
      joinModalDialog,
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  };

  const mountJoinModal = async (): Promise<void> => {
    if (joinModalRoot) return;

    if (!joinModalMountPromise) {
      joinModalMountPromise = (async () => {
        const portalRoot = ensureJoinModalPortalRoot();
        const { buildJoinModalMarkup } = await import('./join-modal-markup');

        portalRoot.innerHTML = buildJoinModalMarkup({
          serverIp: config.serverIp,
          mcVersion: config.mcVersion,
        });

        const mountedRoot = qs<HTMLElement>('[data-join-modal]', portalRoot);
        if (!mountedRoot) {
          portalRoot.innerHTML = '';
          clearJoinModalRefs();
          throw new Error('Join-Modal konnte nicht gemountet werden.');
        }

        joinModalRoot = mountedRoot;
        joinModalDialog = qs<HTMLElement>('[data-join-modal-dialog]', mountedRoot);
        joinModalOverlay = qs<HTMLElement>('[data-join-modal-overlay]', mountedRoot);
        joinModalCloseButtons = qsa<HTMLElement>('[data-join-modal-close]', mountedRoot);
        joinModalCopyButtons = qsa<HTMLElement>('[data-copy-ip-modal]', mountedRoot);

        if (joinModalOverlay) {
          joinModalOverlay.addEventListener('click', () => closeJoinModal());
        }

        joinModalCloseButtons.forEach((btn) => {
          btn.addEventListener('click', () => closeJoinModal());
        });

        joinModalCopyButtons.forEach((btn) => {
          btn.addEventListener('click', async (e: MouseEvent) => {
            e.preventDefault();
            const ok = await copyIp({ silentSuccess: true });
            if (ok) flashModalCopyButton(btn);
          });
        });
      })().finally(() => {
        joinModalMountPromise = null;
      });
    }

    await joinModalMountPromise;
  };

  const unmountJoinModal = (): void => {
    joinModalCopyFeedbackTimers.forEach((timer) => window.clearTimeout(timer));
    joinModalCopyFeedbackTimers.clear();

    const portalRoot = ensureJoinModalPortalRoot();
    portalRoot.innerHTML = '';
    clearJoinModalRefs();
  };

  const closeJoinModal = (): void => {
    if (!isJoinModalOpen()) return;

    try {
      unmountJoinModal();
    } finally {
      setModalBackgroundInert(false);
      document.body.style.overflow = bodyOverflowBeforeModal;
    }

    if (modalLastFocusedEl && document.contains(modalLastFocusedEl)) {
      modalLastFocusedEl.focus();
    }
    modalLastFocusedEl = null;
  };

  const openJoinModal = async (triggerEl?: HTMLElement): Promise<void> => {
    if (isJoinModalOpen()) return;

    modalLastFocusedEl =
      triggerEl && document.contains(triggerEl)
        ? triggerEl
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    bodyOverflowBeforeModal = document.body.style.overflow;

    try {
      await mountJoinModal();
    } catch (error) {
      setModalBackgroundInert(false);
      document.body.style.overflow = bodyOverflowBeforeModal;
      console.warn('Join-Modal konnte nicht geladen werden:', error);
      showToast('Join-Dialog konnte nicht geladen werden.', 'error');
      return;
    }

    if (!joinModalDialog) {
      closeJoinModal();
      return;
    }
    const dialog = joinModalDialog;
    document.body.style.overflow = 'hidden';
    setModalBackgroundInert(true);

    window.setTimeout(() => {
      const focusable = getJoinModalFocusable();
      const preferredTarget = qs<HTMLElement>('[data-join-modal-initial-focus]', dialog);
      const focusTarget =
        (preferredTarget && focusable.includes(preferredTarget) ? preferredTarget : null) ??
        focusable[0] ??
        dialog;
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
    const activeEl = active instanceof HTMLElement ? active : null;

    if (!activeEl || !joinModalDialog.contains(activeEl)) {
      e.preventDefault();
      if (e.shiftKey) last.focus();
      else first.focus();
      return;
    }

    const activeIndex = focusable.indexOf(activeEl);
    if (activeIndex === -1) {
      e.preventDefault();
      if (e.shiftKey) last.focus();
      else first.focus();
      return;
    }

    if (e.shiftKey && activeIndex === 0) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && activeIndex === focusable.length - 1) {
      e.preventDefault();
      first.focus();
    }
  };

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
      void openJoinModal(btn);
    });
  });
};
