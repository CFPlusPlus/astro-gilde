/*
  theme-color-sync.ts
  -------------------
  Keeps <meta name="theme-color"> in sync with CSS variable --bg.
*/

interface ThemeColorSyncState {
  cleanup: (() => void) | null;
  handlersBound: boolean;
}

declare global {
  interface Window {
    __MG_THEME_COLOR_SYNC_STATE__?: ThemeColorSyncState;
  }
}

const getState = (): ThemeColorSyncState => {
  if (!window.__MG_THEME_COLOR_SYNC_STATE__) {
    window.__MG_THEME_COLOR_SYNC_STATE__ = {
      cleanup: null,
      handlersBound: false,
    };
  }
  return window.__MG_THEME_COLOR_SYNC_STATE__;
};

const initThemeColorSync = (): (() => void) => {
  try {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const root = document.documentElement;
    if (!meta || !root) return () => {};

    const update = (): void => {
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (bg) meta.setAttribute('content', bg);
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = () => update();
    const legacyMq = mq as unknown as {
      addListener?: (callback: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (callback: (event: MediaQueryListEvent) => void) => void;
    };

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onMqChange);
    } else {
      legacyMq.addListener?.(onMqChange);
    }

    window.addEventListener('DOMContentLoaded', update);

    return () => {
      observer.disconnect();
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', onMqChange);
      } else {
        legacyMq.removeListener?.(onMqChange);
      }
      window.removeEventListener('DOMContentLoaded', update);
    };
  } catch {
    return () => {};
  }
};

const state = getState();

const mountThemeColorSync = (): void => {
  state.cleanup?.();
  state.cleanup = initThemeColorSync();
};

const unmountThemeColorSync = (): void => {
  state.cleanup?.();
  state.cleanup = null;
};

if (!state.handlersBound) {
  document.addEventListener('astro:before-swap', unmountThemeColorSync);
  document.addEventListener('astro:page-load', mountThemeColorSync);
  state.handlersBound = true;
}

mountThemeColorSync();

export {};
