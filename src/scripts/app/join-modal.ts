import type { Qs, Qsa } from './dom';
import type { JoinModalController } from './join-modal-controller';
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
  const JOIN_MODAL_SCROLL_LOCK_ID = 'join-modal';
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

  const inlineCopyFeedbackTimers = new WeakMap<HTMLElement, number>();

  const setInlineCopyButtonState = (btn: HTMLElement, copied: boolean): void => {
    const labelDefault = btn.querySelector<HTMLElement>('[data-copy-ip-inline-label-default]');
    const labelSuccess = btn.querySelector<HTMLElement>('[data-copy-ip-inline-label-success]');

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

  qsa<HTMLElement>('[data-copy-ip-inline]').forEach((btn) => {
    btn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      const ok = await copyIp({ silentSuccess: true });
      if (ok) flashInlineCopyButton(btn);
    });
  });

  let joinModalControllerPromise: Promise<JoinModalController> | null = null;
  let joinModalPrefetchStarted = false;

  const loadJoinModalController = (): Promise<JoinModalController> => {
    if (!joinModalControllerPromise) {
      joinModalControllerPromise = import('./join-modal-controller').then(
        ({ createJoinModalController }) =>
          createJoinModalController({
            config,
            qs,
            qsa,
            showToast,
            copyIp,
          }),
      );
    }

    return joinModalControllerPromise;
  };

  const prefetchJoinModalController = (): void => {
    if (joinModalPrefetchStarted) return;
    joinModalPrefetchStarted = true;
    void loadJoinModalController();
  };

  const openJoinModal = async (triggerEl: HTMLElement): Promise<void> => {
    const controller = await loadJoinModalController();
    await controller.openJoinModal(triggerEl);
  };

  qsa<HTMLElement>('[data-copy-ip]').forEach((btn) => {
    btn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      closeMenu();
      void openJoinModal(btn);
    });

    btn.addEventListener('pointerenter', prefetchJoinModalController, {
      passive: true,
      once: true,
    });
    btn.addEventListener('focus', prefetchJoinModalController, { once: true });
    btn.addEventListener('touchstart', prefetchJoinModalController, {
      passive: true,
      once: true,
    });
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('[data-join-modal-dialog]')) return;
    if (isMenuOpen()) closeMenu();
  });
};
