/*
  app-home.ts
  -----------
  Home-specific behavior:
  - Player list (mcsrvstat.us)
  - World age counter
  - Gallery
*/

interface PlayerEntry {
  uuid?: string;
  name?: string;
}

interface ServerStatus {
  online?: boolean;
  players?: {
    online?: number;
    list?: PlayerEntry[];
  };
}

const POLL_MS = 12_000;
const FETCH_TIMEOUT_MS = 8_000;

const qs = <T extends Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

const minotarURL = (uuid: string, name: string, size = 80): string =>
  uuid
    ? `https://minotar.net/helm/${encodeURIComponent(uuid)}/${size}.png`
    : `https://minotar.net/helm/${encodeURIComponent(name)}/${size}.png`;

const mcHeadsURL = (uuid: string, name: string, size = 80): string =>
  uuid
    ? `https://mc-heads.net/avatar/${encodeURIComponent(uuid)}/${size}`
    : `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;

const diffInFullMonths = (from: Date, to: Date): number => {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  let totalMonths = years * 12 + months;
  if (to.getDate() < from.getDate()) totalMonths--;
  return Math.max(0, totalMonths);
};

const formatUnit = (n: number, singular: string, plural: string): string =>
  `${n} ${n === 1 ? singular : plural}`;

const shuffleInPlace = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const setMountMessage = (mount: HTMLElement, message: string): void => {
  const p = document.createElement('p');
  p.className = 'text-sm text-muted';
  p.textContent = message;
  mount.replaceChildren(p);
};

function renderPlayers(data: ServerStatus): void {
  const mount = qs<HTMLElement>('#player-list');
  if (!mount) return;

  const hasPlayers =
    data.online &&
    (data.players?.online ?? 0) > 0 &&
    Array.isArray(data.players?.list) &&
    data.players.list.length > 0;

  if (!hasPlayers) {
    setMountMessage(mount, 'Keine Spieler online.');
    return;
  }

  const players = data.players?.list ?? [];
  const container = document.createElement('div');
  container.className =
    'flex flex-wrap gap-2 items-center justify-start overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]';

  const label = document.createElement('div');
  label.className = 'text-xs font-medium text-muted mr-2';
  label.textContent = 'Spieler online:';
  container.appendChild(label);

  players.forEach((player) => {
    const uuid = player.uuid ?? '';
    const name = player.name ?? 'Unbekannt';

    const btn = document.createElement('a');
    btn.href = uuid
      ? `/statistiken/spieler/?uuid=${encodeURIComponent(uuid)}`
      : `/statistiken/spieler/?name=${encodeURIComponent(name)}`;
    btn.className =
      'group inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm text-fg/90 hover:text-fg hover:bg-surface-solid/70 transition-colors';

    const img = document.createElement('img');
    img.className = 'h-6 w-6 rounded-full';
    img.alt = name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = minotarURL(uuid, name, 48);

    const onError = (): void => {
      const step = Number(img.dataset.fallbackStep ?? '0');
      if (step === 0) {
        img.dataset.fallbackStep = '1';
        img.src = mcHeadsURL(uuid, name, 48);
        return;
      }

      img.removeEventListener('error', onError);
      img.style.display = 'none';
    };

    img.addEventListener('error', onError);

    const span = document.createElement('span');
    span.textContent = name;

    btn.appendChild(img);
    btn.appendChild(span);
    container.appendChild(btn);
  });

  mount.replaceChildren(container);
}

function initGallery(): () => void {
  const root = qs<HTMLElement>('[data-gallery]');
  if (!root) return () => {};

  const imgA = root.querySelector<HTMLImageElement>('[data-gallery-a]');
  const imgB = root.querySelector<HTMLImageElement>('[data-gallery-b]');
  const placeholder = root.querySelector<HTMLElement>('[data-gallery-placeholder]');
  const prevBtn = root.querySelector<HTMLElement>('[data-gallery-prev]');
  const nextBtn = root.querySelector<HTMLElement>('[data-gallery-next]');
  if (!imgA || !imgB) return () => {};

  const setOpacity = (el: HTMLElement, value: number): void => {
    el.style.opacity = String(value);
  };

  const revealPlaceholder = (): void => {
    if (!placeholder) return;
    placeholder.style.transition = 'opacity 450ms ease';
    placeholder.style.opacity = '0';
  };

  const showSingle = (): void => {
    setOpacity(imgA, 1);
    setOpacity(imgB, 0);
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
  const intervalMs = Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : 5200;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeMs = prefersReduced ? 0 : 700;
  const order = shuffleInPlace(images.slice());

  let index = 0;
  let front: HTMLImageElement = imgA;
  let back: HTMLImageElement = imgB;
  let timer: number | null = null;
  let transitionTimer: number | null = null;
  let isAutoplayPaused = false;
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

  const findNextIndex = async (fromIndex: number, delta: number): Promise<number | null> => {
    for (let tries = 1; tries <= order.length; tries++) {
      const i = (fromIndex + delta * tries + order.length) % order.length;
      const ok = await preloadOk(order[i]);
      if (ok) return i;
    }
    return null;
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

    let nextIndex = targetIndex;
    if (!(await preloadOk(order[nextIndex]))) {
      const fallbackIndex = await findNextIndex(index, +1);
      if (fallbackIndex == null) {
        isTransitioning = false;
        return;
      }
      nextIndex = fallbackIndex;
    }

    const nextSrc = order[nextIndex];
    const ok = await setSrcSafe(back, nextSrc);
    if (!ok || disposed) {
      isTransitioning = false;
      return;
    }

    const afterIndex = await findNextIndex(nextIndex, +1);
    if (afterIndex != null) {
      void preloadOk(order[afterIndex]);
    }

    if (fadeMs === 0) {
      front.src = nextSrc;
      index = nextIndex;
      isTransitioning = false;
      return;
    }

    setOpacity(back, 1);
    setOpacity(front, 0);

    transitionTimer = window.setTimeout(() => {
      if (disposed) return;
      const tmp = front;
      front = back;
      back = tmp;

      setOpacity(back, 0);
      index = nextIndex;
      isTransitioning = false;
    }, fadeMs + 30);
  };

  const step = async (): Promise<void> => {
    if (disposed || isAutoplayPaused || document.hidden) return;
    const nextIndex = await findNextIndex(index, +1);
    if (nextIndex == null) return;
    void transitionTo(nextIndex);
  };

  const start = (): void => {
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
    if (!isAutoplayPaused || disposed) return;
    isAutoplayPaused = false;
    start();
  };

  const nudge = async (delta: number): Promise<void> => {
    const nextIndex = await findNextIndex(index, delta);
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

    const nextIndex = await findNextIndex(index, +1);
    if (nextIndex != null) {
      back.src = order[nextIndex];
    }

    setOpacity(front, 1);
    setOpacity(back, 0);
    revealPlaceholder();
    start();
  })();

  return () => {
    disposed = true;
    if (timer != null) window.clearInterval(timer);
    if (transitionTimer != null) window.clearTimeout(transitionTimer);
    cleanupFns.forEach((fn) => fn());
  };
}

function initHomeApp(): () => void {
  const config: BrowserAppConfig = window.__APP_CONFIG__ ?? { serverIp: 'minecraft-gilde.de' };
  let destroyed = false;
  let isFetchInFlight = false;
  let pollTimer: number | null = null;
  let fetchController: AbortController | null = null;

  const fetchPlayers = async (): Promise<void> => {
    const mount = qs<HTMLElement>('#player-list');
    if (!mount) return;
    if (isFetchInFlight) return;
    if (destroyed) return;

    isFetchInFlight = true;
    const ip = config.serverIp || 'minecraft-gilde.de';
    const controller = new AbortController();
    fetchController = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const url = `https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`;
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as ServerStatus;
      if (!destroyed) renderPlayers(data);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      if (!isAbort) console.warn('fetchPlayers Fehler:', err);
      if (!destroyed) setMountMessage(mount, 'Spieleranzeige aktuell nicht verfuegbar.');
    } finally {
      window.clearTimeout(timeoutId);
      if (fetchController === controller) {
        fetchController = null;
      }
      isFetchInFlight = false;
    }
  };

  const renderWorldAge = async (): Promise<void> => {
    const el = qs<HTMLElement>('#world-age');
    if (!el) return;

    const worldStart = new Date(2024, 1, 26); // 26 Feb 2024
    let now = new Date();

    try {
      const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
      const dateHeader = response.headers.get('Date');
      if (dateHeader) {
        const parsed = new Date(dateHeader);
        if (!Number.isNaN(parsed.getTime())) now = parsed;
      }
    } catch {
      // fallback to client time
    }

    const totalMonths = diffInFullMonths(worldStart, now);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts: string[] = [];
    if (years > 0) parts.push(formatUnit(years, 'Jahr', 'Jahre'));
    parts.push(formatUnit(months, 'Monat', 'Monate'));
    el.textContent = parts.join(' - ');
  };

  const stopGallery = initGallery();
  void fetchPlayers();
  void renderWorldAge();
  pollTimer = window.setInterval(() => {
    void fetchPlayers();
  }, POLL_MS);

  return () => {
    destroyed = true;
    if (pollTimer != null) window.clearInterval(pollTimer);
    fetchController?.abort();
    stopGallery();
  };
}

let cleanup: (() => void) | null = null;

const mountHome = () => {
  cleanup?.();
  cleanup = initHomeApp();
};

const unmountHome = () => {
  cleanup?.();
  cleanup = null;
};

mountHome();
document.addEventListener('astro:before-swap', unmountHome);
document.addEventListener('astro:page-load', mountHome);
