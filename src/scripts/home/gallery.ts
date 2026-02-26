const qs = <T extends Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

const getNetworkHints = (): { saveData: boolean; slowNetwork: boolean } => {
  if (typeof navigator === 'undefined') {
    return { saveData: false, slowNetwork: false };
  }

  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  const effectiveType = (connection?.effectiveType ?? '').toLowerCase();
  const slowNetwork = effectiveType.includes('2g') || effectiveType === '3g';

  return {
    saveData: connection?.saveData === true,
    slowNetwork,
  };
};

const shuffleInPlace = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function initHomeGallery(): () => void {
  const root = qs<HTMLElement>('[data-gallery]');
  if (!root) return () => {};

  const imgA = root.querySelector<HTMLImageElement>('[data-gallery-a]');
  const imgB = root.querySelector<HTMLImageElement>('[data-gallery-b]');
  const placeholder = root.querySelector<HTMLElement>('[data-gallery-placeholder]');
  const prevBtn = root.querySelector<HTMLElement>('[data-gallery-prev]');
  const nextBtn = root.querySelector<HTMLElement>('[data-gallery-next]');
  if (!imgA || !imgB) return () => {};

  const setVisible = (el: HTMLElement, visible: boolean): void => {
    el.classList.toggle('opacity-100', visible);
    el.classList.toggle('opacity-0', !visible);
  };

  const revealPlaceholder = (): void => {
    if (!placeholder) return;
    placeholder.classList.add('opacity-0');
  };

  const showSingle = (): void => {
    setVisible(imgA, true);
    setVisible(imgB, false);
    revealPlaceholder();
  };

  const raw = root.getAttribute('data-gallery-images') || '[]';
  let images: string[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      images = parsed.filter((s): s is string => typeof s === 'string' && s.length > 0);
    }
  } catch {
    images = [];
  }

  if (images.length < 2) {
    showSingle();
    return () => {};
  }

  const parsedInterval = Number(root.getAttribute('data-gallery-interval') || '5200');
  const parsedPreloadDelayDefault = Number(
    root.getAttribute('data-gallery-preload-delay-default') || '350',
  );
  const parsedPreloadDelaySlow = Number(
    root.getAttribute('data-gallery-preload-delay-slow') || '1200',
  );
  const intervalMs = Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : 5200;
  const preloadDelayDefaultMs =
    Number.isFinite(parsedPreloadDelayDefault) && parsedPreloadDelayDefault >= 0
      ? parsedPreloadDelayDefault
      : 350;
  const preloadDelaySlowMs =
    Number.isFinite(parsedPreloadDelaySlow) && parsedPreloadDelaySlow >= 0
      ? parsedPreloadDelaySlow
      : 1200;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeMs = prefersReduced ? 0 : 700;
  const { saveData, slowNetwork } = getNetworkHints();
  const autoplayAllowed = !saveData;
  const allowIdlePreload = !saveData;
  const preloadDelayMs = slowNetwork ? preloadDelaySlowMs : preloadDelayDefaultMs;
  const order = shuffleInPlace(images.slice());

  let index = 0;
  let front: HTMLImageElement = imgA;
  let back: HTMLImageElement = imgB;
  let timer: number | null = null;
  let transitionTimer: number | null = null;
  let idlePreloadTimer: number | null = null;
  let idlePreloadHandle: number | null = null;
  let pendingPreloadSrc: string | null = null;
  let isAutoplayPaused = !autoplayAllowed;
  let isTransitioning = false;
  let touchStartX: number | null = null;
  let touchStartY: number | null = null;
  let disposed = false;

  const bad = new Set<string>();
  const cleanupFns: Array<() => void> = [];

  const preloadOk = (src: string): Promise<boolean> =>
    new Promise((resolve) => {
      if (!src) return resolve(false);
      if (bad.has(src)) return resolve(false);

      const tmp = new Image();
      let done = false;

      const finish = (ok: boolean): void => {
        if (done) return;
        done = true;
        if (!ok) bad.add(src);
        resolve(ok);
      };

      tmp.decoding = 'async';
      tmp.loading = 'eager';
      tmp.onload = () => finish(true);
      tmp.onerror = () => finish(false);
      tmp.src = src;

      if (tmp.complete) {
        finish(tmp.naturalWidth > 0);
      }
    });

  const pickFirstLoadableIndex = async (startAt = 0): Promise<number | null> => {
    for (let tries = 0; tries < order.length; tries++) {
      const i = (startAt + tries) % order.length;
      const ok = await preloadOk(order[i]);
      if (ok) return i;
    }
    return null;
  };

  const findNextIndex = (fromIndex: number, delta: number): number | null => {
    for (let tries = 1; tries <= order.length; tries++) {
      const i = (fromIndex + delta * tries + order.length) % order.length;
      if (!bad.has(order[i])) return i;
    }
    return null;
  };

  const cancelPendingIdlePreload = (): void => {
    if (idlePreloadTimer != null) {
      window.clearTimeout(idlePreloadTimer);
      idlePreloadTimer = null;
    }

    if (idlePreloadHandle != null && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idlePreloadHandle);
      idlePreloadHandle = null;
    }
    pendingPreloadSrc = null;
  };

  const scheduleIdlePreload = (src: string): void => {
    if (!allowIdlePreload || !src || bad.has(src) || disposed) return;
    if (pendingPreloadSrc === src && (idlePreloadTimer != null || idlePreloadHandle != null))
      return;

    cancelPendingIdlePreload();
    pendingPreloadSrc = src;

    idlePreloadTimer = window.setTimeout(() => {
      idlePreloadTimer = null;

      const run = () => {
        idlePreloadHandle = null;
        const target = pendingPreloadSrc;
        pendingPreloadSrc = null;
        if (!target || disposed || document.hidden) return;
        void preloadOk(target);
      };

      if (typeof window.requestIdleCallback === 'function') {
        idlePreloadHandle = window.requestIdleCallback(run, { timeout: preloadDelayMs + 1000 });
      } else {
        run();
      }
    }, preloadDelayMs);
  };

  const scheduleNextIdlePreload = (fromIndex: number): void => {
    const nextIndex = findNextIndex(fromIndex, +1);
    if (nextIndex == null) return;
    scheduleIdlePreload(order[nextIndex]);
  };

  const setSrcSafe = async (el: HTMLImageElement, src: string): Promise<boolean> => {
    const ok = await preloadOk(src);
    if (!ok) return false;
    el.src = src;
    return true;
  };

  const transitionTo = async (targetIndex: number): Promise<void> => {
    if (disposed || document.hidden) return;
    if (isTransitioning) return;
    isTransitioning = true;

    let nextIndex: number | null = targetIndex;
    let nextSrc = '';
    let loaded = false;

    for (let tries = 0; tries < order.length; tries++) {
      if (nextIndex == null) break;
      nextSrc = order[nextIndex];
      loaded = await setSrcSafe(back, nextSrc);
      if (loaded) break;
      nextIndex = findNextIndex(nextIndex, +1);
    }

    if (!loaded || nextIndex == null || disposed) {
      isTransitioning = false;
      return;
    }

    scheduleNextIdlePreload(nextIndex);

    if (fadeMs === 0) {
      front.src = nextSrc;
      index = nextIndex;
      isTransitioning = false;
      return;
    }

    setVisible(back, true);
    setVisible(front, false);

    transitionTimer = window.setTimeout(() => {
      if (disposed) return;
      const tmp = front;
      front = back;
      back = tmp;

      setVisible(back, false);
      index = nextIndex;
      isTransitioning = false;
    }, fadeMs + 30);
  };

  const step = async (): Promise<void> => {
    if (disposed || isAutoplayPaused || document.hidden) return;
    const nextIndex = findNextIndex(index, +1);
    if (nextIndex == null) return;
    void transitionTo(nextIndex);
  };

  const start = (): void => {
    if (!autoplayAllowed || disposed) return;
    if (timer != null) window.clearInterval(timer);
    timer = window.setInterval(() => {
      void step();
    }, intervalMs);
  };

  const pause = (): void => {
    isAutoplayPaused = true;
    if (timer != null) window.clearInterval(timer);
    timer = null;
  };

  const resume = (): void => {
    if (!autoplayAllowed) return;
    if (!isAutoplayPaused || disposed) return;
    isAutoplayPaused = false;
    start();
  };

  const nudge = async (delta: number): Promise<void> => {
    const nextIndex = findNextIndex(index, delta);
    if (nextIndex == null) return;
    void transitionTo(nextIndex);
    if (!isAutoplayPaused) start();
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX == null || touchStartY == null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;

    if (Math.abs(dx) < 40) return;
    if (Math.abs(dx) < Math.abs(dy)) return;

    if (dx > 0) void nudge(-1);
    else void nudge(1);
  };

  const onVisibilityChange = () => {
    if (document.hidden) pause();
    else resume();
  };

  if (prevBtn) {
    const onPrev = () => void nudge(-1);
    prevBtn.addEventListener('click', onPrev);
    cleanupFns.push(() => prevBtn.removeEventListener('click', onPrev));
  }

  if (nextBtn) {
    const onNext = () => void nudge(1);
    nextBtn.addEventListener('click', onNext);
    cleanupFns.push(() => nextBtn.removeEventListener('click', onNext));
  }

  root.addEventListener('touchstart', onTouchStart, { passive: true });
  cleanupFns.push(() => root.removeEventListener('touchstart', onTouchStart));

  root.addEventListener('touchend', onTouchEnd, { passive: true });
  cleanupFns.push(() => root.removeEventListener('touchend', onTouchEnd));

  root.addEventListener('mouseenter', pause);
  cleanupFns.push(() => root.removeEventListener('mouseenter', pause));

  root.addEventListener('mouseleave', resume);
  cleanupFns.push(() => root.removeEventListener('mouseleave', resume));

  root.addEventListener('focusin', pause);
  cleanupFns.push(() => root.removeEventListener('focusin', pause));

  root.addEventListener('focusout', resume);
  cleanupFns.push(() => root.removeEventListener('focusout', resume));

  document.addEventListener('visibilitychange', onVisibilityChange);
  cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));

  void (async () => {
    showSingle();
    const firstIndex = await pickFirstLoadableIndex(0);
    if (firstIndex == null || disposed) return;

    index = firstIndex;
    await setSrcSafe(front, order[index]);
    if (disposed) return;

    setVisible(front, true);
    setVisible(back, false);
    revealPlaceholder();
    scheduleNextIdlePreload(index);
    start();
  })();

  return () => {
    disposed = true;
    if (timer != null) window.clearInterval(timer);
    if (transitionTimer != null) window.clearTimeout(transitionTimer);
    cancelPendingIdlePreload();
    cleanupFns.forEach((fn) => fn());
  };
}
