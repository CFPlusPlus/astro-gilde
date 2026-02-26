import { readBrowserAppConfig } from './app-config';
import { qsa, qs } from './app/dom';
import { initNavMenu } from './app/nav-menu';
import { initTheme } from './app/theme';
import { initToast } from './app/toast';

/*
  Globales Verhalten der Seite:
  - Theme-Toggle (system/light/dark) mit localStorage
  - Navbar-Menue-Toggle + Click-Outside + Escape
  - Helper zum Kopieren der Server-IP
  - Online-Zaehler (Discord + Minecraft)
  - Schlanker Toast
*/

type Cleanup = () => void;

const hasAnyTarget = (selector: string): boolean => document.querySelector(selector) !== null;

(() => {
  let cleanup: Cleanup = () => {};
  let mountRunId = 0;

  const unmountApp = (): void => {
    mountRunId += 1;
    cleanup();
    cleanup = () => {};
  };

  const mountApp = (): void => {
    mountRunId += 1;
    const runId = mountRunId;
    cleanup();
    cleanup = () => {};

    void (async () => {
      const nextCleanup: Cleanup[] = [];
      const addCleanup = (fn?: Cleanup | void): void => {
        if (typeof fn === 'function') nextCleanup.push(fn);
      };

      try {
        const config = readBrowserAppConfig({});
        const toast = initToast(qs);
        addCleanup(initTheme({ qs, qsa, showToast: toast.showToast }));

        const menu = initNavMenu({ qs, qsa });
        addCleanup(menu.cleanup);

        if (hasAnyTarget('[data-motion], [data-reveal]')) {
          const { initPageMotion } = await import('./app/motion');
          if (runId !== mountRunId) return;
          addCleanup(initPageMotion());
        }

        if (hasAnyTarget('[data-mc-online], [data-discord-online], [data-discord-members]')) {
          const { initLiveCounters } = await import('./app/live-counters');
          if (runId !== mountRunId) return;
          addCleanup(initLiveCounters({ config, qsa }));
        }

        if (hasAnyTarget('[data-join-modal], [data-copy-ip], [data-copy-ip-inline]')) {
          const { initJoinModal } = await import('./app/join-modal');
          if (runId !== mountRunId) return;
          addCleanup(
            initJoinModal({
              config,
              qs,
              qsa,
              showToast: toast.showToast,
              closeMenu: menu.closeMenu,
              isMenuOpen: menu.isMenuOpen,
            }),
          );
        }
      } finally {
        const runCleanup = (): void => {
          while (nextCleanup.length > 0) {
            const stop = nextCleanup.pop();
            stop?.();
          }
        };

        const isStaleMount = runId !== mountRunId;
        if (isStaleMount) {
          runCleanup();
        } else {
          cleanup = runCleanup;
        }
      }
    })();
  };

  mountApp();
  document.addEventListener('astro:before-swap', unmountApp);
  document.addEventListener('astro:page-load', mountApp);
})();
