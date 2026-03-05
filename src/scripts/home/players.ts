import { readBrowserAppConfig } from '../app-config';

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
const POLL_RESUME_JITTER_MS = 750;

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
    'mg-scrollbar flex flex-wrap gap-2 items-center justify-start overflow-x-auto';

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
    btn.className = 'mg-pill';

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
      img.classList.add('hidden');
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

export function initHomePlayers(): () => void {
  const config = readBrowserAppConfig({});
  let destroyed = false;
  let isFetchInFlight = false;
  let pollTimer: number | null = null;
  let resumeTimer: number | null = null;
  let fetchController: AbortController | null = null;

  const fetchPlayers = async (): Promise<void> => {
    const mount = qs<HTMLElement>('#player-list');
    if (!mount) return;
    if (isFetchInFlight) return;
    if (destroyed) return;

    isFetchInFlight = true;
    const ip = config.serverIp;
    if (!ip) {
      setMountMessage(mount, 'Server-IP aktuell nicht verfügbar.');
      isFetchInFlight = false;
      return;
    }
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
      if (!destroyed) setMountMessage(mount, 'Spieleranzeige aktuell nicht verfügbar.');
    } finally {
      window.clearTimeout(timeoutId);
      if (fetchController === controller) {
        fetchController = null;
      }
      isFetchInFlight = false;
    }
  };

  const clearPollTimer = (): void => {
    if (pollTimer != null) {
      window.clearTimeout(pollTimer);
      pollTimer = null;
    }
  };

  const clearResumeTimer = (): void => {
    if (resumeTimer != null) {
      window.clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  };

  const scheduleNextPoll = (delayMs = POLL_MS): void => {
    if (destroyed || document.visibilityState !== 'visible') return;
    clearPollTimer();
    pollTimer = window.setTimeout(() => {
      void fetchPlayers();
      scheduleNextPoll(POLL_MS);
    }, delayMs);
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      clearPollTimer();
      clearResumeTimer();
      fetchController?.abort();
      return;
    }

    const jitterMs = Math.floor(Math.random() * POLL_RESUME_JITTER_MS);
    clearResumeTimer();
    resumeTimer = window.setTimeout(() => {
      void fetchPlayers();
      scheduleNextPoll(POLL_MS);
    }, jitterMs);
  };

  if (document.visibilityState === 'visible') {
    void fetchPlayers();
    scheduleNextPoll(POLL_MS);
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    destroyed = true;
    clearPollTimer();
    clearResumeTimer();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    fetchController?.abort();
  };
}
