/*
  app-home.js
  ----------
  Home-specific behavior:
  - Player list (mcsrvstat.us)
  - World age counter (based on world start date)

  Uses window.__APP_CONFIG__ from V2Layout.
*/

(() => {
  const config = window.__APP_CONFIG__ || { serverIp: 'minecraft-gilde.de' };
  const qs = (sel, root = document) => root.querySelector(sel);

  const POLL_MS = 12_000;
  const FETCH_TIMEOUT_MS = 8_000;
  let isFetchInFlight = false;

  const minotarURL = (uuid, name, size = 80) =>
    uuid
      ? `https://minotar.net/helm/${encodeURIComponent(uuid)}/${size}.png`
      : `https://minotar.net/helm/${encodeURIComponent(name)}/${size}.png`;

  const mcHeadsURL = (uuid, name, size = 80) =>
    uuid
      ? `https://mc-heads.net/avatar/${encodeURIComponent(uuid)}/${size}`
      : `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;

  // -------------------------
  // Player list
  // -------------------------
  const renderPlayers = (data) => {
    const mount = qs('#player-list');
    if (!mount) return;

    const hasPlayers =
      data?.online &&
      data?.players?.online > 0 &&
      Array.isArray(data?.players?.list) &&
      data.players.list.length > 0;

    if (!hasPlayers) {
      mount.innerHTML = '<p class="text-sm text-muted">Keine Spieler online.</p>';
      return;
    }

    const players = data.players.list;

    const container = document.createElement('div');
    container.className =
      'flex flex-wrap gap-2 items-center justify-start overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]';

    const label = document.createElement('div');
    label.className = 'text-xs font-medium text-muted mr-2';
    label.textContent = 'Spieler online:';

    container.appendChild(label);

    players.forEach((p) => {
      const uuid = p?.uuid || '';
      const name = p?.name || 'Unbekannt';

      const btn = document.createElement('a');
      btn.href = uuid
        ? `/playerstats.html?uuid=${encodeURIComponent(uuid)}`
        : `/playerstats.html?name=${encodeURIComponent(name)}`;
      btn.className =
        'group inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm text-fg/90 hover:text-fg hover:bg-surface-solid/70 transition-colors';

      const img = document.createElement('img');
      img.className = 'h-6 w-6 rounded-full';
      img.alt = name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = minotarURL(uuid, name, 48);

      img.addEventListener('error', function onError() {
        const step = Number(img.dataset.fallbackStep || '0');
        if (step === 0) {
          img.dataset.fallbackStep = '1';
          img.src = mcHeadsURL(uuid, name, 48);
          return;
        }
        img.removeEventListener('error', onError);
        img.style.display = 'none';
      });

      const span = document.createElement('span');
      span.textContent = name;

      btn.appendChild(img);
      btn.appendChild(span);
      container.appendChild(btn);
    });

    mount.innerHTML = '';
    mount.appendChild(container);
  };

  const fetchPlayers = async () => {
    const mount = qs('#player-list');
    if (!mount) return;

    if (isFetchInFlight) return;
    isFetchInFlight = true;

    const ip = config.serverIp || 'minecraft-gilde.de';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const url = `https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`;
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      renderPlayers(data);
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn('fetchPlayers Fehler:', err);
      mount.innerHTML = '<p class="text-sm text-muted">Spieleranzeige aktuell nicht verfügbar.</p>';
    } finally {
      window.clearTimeout(timeoutId);
      isFetchInFlight = false;
    }
  };

  // -------------------------
  // World age
  // -------------------------
  const diffInFullMonths = (from, to) => {
    const years = to.getFullYear() - from.getFullYear();
    const months = to.getMonth() - from.getMonth();
    let totalMonths = years * 12 + months;
    if (to.getDate() < from.getDate()) totalMonths--;
    return Math.max(0, totalMonths);
  };

  const formatUnit = (n, s, p) => `${n} ${n === 1 ? s : p}`;

  const renderWorldAge = async () => {
    const el = qs('#world-age');
    if (!el) return;

    const worldStart = new Date(2024, 1, 26); // 26 Feb 2024
    let now = new Date();

    try {
      const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
      const dateHeader = response.headers.get('Date');
      if (dateHeader) {
        const parsed = new Date(dateHeader);
        if (!isNaN(parsed.getTime())) now = parsed;
      }
    } catch {
      // fallback to client time
    }

    const totalMonths = diffInFullMonths(worldStart, now);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts = [];
    if (years > 0) parts.push(formatUnit(years, 'Jahr', 'Jahre'));
    parts.push(formatUnit(months, 'Monat', 'Monate'));

    el.textContent = parts.join(' · ');
  };

  // -------------------------
  // Gallery (About section)
  // -------------------------
  const shuffleInPlace = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const initGallery = () => {
    const root = qs('[data-gallery]');
    if (!root) return;

    const raw = root.getAttribute('data-gallery-images') || '[]';
    let images;

    try {
      images = JSON.parse(raw);
    } catch {
      images = [];
    }

    if (!Array.isArray(images)) images = [];
    images = images.filter((s) => typeof s === 'string' && s.length > 0);
    if (images.length < 2) return;

    const intervalMs = Number(root.getAttribute('data-gallery-interval') || '5200');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fadeMs = prefersReduced ? 0 : 700;

    const imgA = root.querySelector('[data-gallery-a]');
    const imgB = root.querySelector('[data-gallery-b]');
    const placeholder = root.querySelector('[data-gallery-placeholder]');
    const prevBtn = root.querySelector('[data-gallery-prev]');
    const nextBtn = root.querySelector('[data-gallery-next]');

    if (!imgA || !imgB) return;

    // Shuffle order => random start image
    const order = shuffleInPlace(images.slice());

    let index = 0;
    let front = imgA;
    let back = imgB;
    let timer = null;
    // Autoplay can be paused (e.g. hover/focus), but manual navigation should still work.
    let isAutoplayPaused = false;
    let isTransitioning = false;
    let touchStartX = null;
    let touchStartY = null;

    const preload = (src) => {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = src;
    };

    const ensureLoaded = (el, src) =>
      new Promise((resolve) => {
        if (el.src === src && el.complete && el.naturalWidth > 0) {
          resolve();
          return;
        }

        const onLoad = () => resolve();
        const onError = () => resolve();

        el.addEventListener('load', onLoad, { once: true });
        el.addEventListener('error', onError, { once: true });
        el.src = src;

        // If cached, resolve on next tick
        if (el.complete) {
          queueMicrotask(resolve);
        }
      });

    const setOpacity = (el, v) => {
      el.style.opacity = String(v);
    };

    const revealPlaceholder = () => {
      if (!placeholder) return;
      placeholder.style.transition = 'opacity 450ms ease';
      placeholder.style.opacity = '0';
    };

    const showInitial = async () => {
      // Hide both images to avoid showing the first file briefly
      setOpacity(imgA, 0);
      setOpacity(imgB, 0);

      await ensureLoaded(front, order[index]);

      // Prepare next in background
      const nextIndex = (index + 1) % order.length;
      back.src = order[nextIndex];
      preload(back.src);

      // Reveal
      setOpacity(front, 1);
      setOpacity(back, 0);
      revealPlaceholder();
    };

    const transitionTo = async (nextIndex) => {
      // Manual navigation must work even while autoplay is paused.
      if (document.hidden) return;
      if (isTransitioning) return;
      isTransitioning = true;

      const nextSrc = order[nextIndex];
      const afterNext = order[(nextIndex + 1) % order.length];

      // Load next into back before starting fade
      await ensureLoaded(back, nextSrc);
      preload(afterNext);

      if (fadeMs === 0) {
        front.src = nextSrc;
        index = nextIndex;
        back.src = afterNext;
        isTransitioning = false;
        return;
      }

      // Cross-fade
      setOpacity(back, 1);
      setOpacity(front, 0);

      window.setTimeout(() => {
        // swap
        const tmp = front;
        front = back;
        back = tmp;

        // reset back for next transition
        setOpacity(back, 0);
        index = nextIndex;
        back.src = afterNext;
        isTransitioning = false;
      }, fadeMs + 30);
    };

    const step = () => {
      if (isAutoplayPaused || document.hidden) return;
      const nextIndex = (index + 1) % order.length;
      transitionTo(nextIndex);
    };

    const start = () => {
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(step, intervalMs);
    };

    const pause = () => {
      isAutoplayPaused = true;
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    const resume = () => {
      if (!isAutoplayPaused) return;
      isAutoplayPaused = false;
      start();
    };

    const nudge = (delta) => {
      const nextIndex = (index + delta + order.length) % order.length;
      transitionTo(nextIndex);
      // Restart autoplay so it doesn't instantly jump again
      if (!isAutoplayPaused) start();
    };

    // Init
    showInitial().then(() => {
      // Start autoplay after first image is ready
      start();
    });

    // Controls
    if (prevBtn) prevBtn.addEventListener('click', () => nudge(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => nudge(1));

    // Swipe (touch)
    root.addEventListener(
      'touchstart',
      (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true },
    );

    root.addEventListener(
      'touchend',
      (e) => {
        if (touchStartX == null || touchStartY == null) return;
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return;

        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        touchStartX = null;
        touchStartY = null;

        if (Math.abs(dx) < 40) return;
        if (Math.abs(dx) < Math.abs(dy)) return; // mostly vertical scroll

        if (dx > 0) nudge(-1);
        else nudge(1);
      },
      { passive: true },
    );

    // Pause on hover/focus
    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', resume);

    // Pause when tab is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
      else resume();
    });
  };

  // Init
  fetchPlayers();
  renderWorldAge();
  initGallery();
  window.setInterval(fetchPlayers, POLL_MS);
})();
