import { toApiUrl } from '../../lib/http/apiUrl';

type BanQueryStatus = 'unknown_player' | 'not_banned' | 'banned';
type BanView = 'idle' | 'loading' | 'unknown' | 'not-banned' | 'banned' | 'error';

type BanQueryPlayer = {
  uuid: string | null;
  name: string;
  nameSource: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  seenInStats: boolean;
  seenInUsercache: boolean;
  seenInBans: boolean;
};

type BanQueryBan = {
  reason: string | null;
  bannedBy: string | null;
  bannedAt: string | null;
  expiresAt: string | null;
  isPermanent: boolean;
};

type BanQueryResponse = {
  query: string;
  status: BanQueryStatus;
  player: BanQueryPlayer | null;
  ban: BanQueryBan | null;
};

const DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const readText = (value: string | null | undefined, fallback = '-'): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const formatIsoDate = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return DATE_FORMATTER.format(date);
};

const setText = (root: ParentNode, selector: string, value: string): void => {
  const nodes = root.querySelectorAll<HTMLElement>(selector);
  for (const node of nodes) {
    node.textContent = value;
  }
};

const getMessageFromError = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'aborted';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unbekannter Fehler';
};

const getQueryFromLocation = (): string => {
  const url = new URL(window.location.href);
  const value = (url.searchParams.get('query') ?? '').trim();
  return value;
};

const syncQueryInLocation = (query: string): void => {
  const url = new URL(window.location.href);
  if (query.length > 0) {
    url.searchParams.set('query', query);
  } else {
    url.searchParams.delete('query');
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
};

export function initBanQuery(): () => void {
  const root = document.querySelector<HTMLElement>('[data-ban-query-app]');
  if (!root) return () => {};

  const form = root.querySelector<HTMLFormElement>('[data-ban-form]');
  const input = root.querySelector<HTMLInputElement>('[data-ban-input]');
  const submitButton = root.querySelector<HTMLButtonElement>('[data-ban-submit-button]');
  const clearButton = root.querySelector<HTMLElement>('[data-ban-search-clear]');
  const feedback = root.querySelector<HTMLElement>('[data-ban-feedback]');
  const errorMessage = root.querySelector<HTMLElement>('[data-ban-error-message]');

  if (!form || !input || !submitButton || !feedback || !errorMessage || !clearButton) {
    return () => {};
  }

  const views = new Map<string, HTMLElement>();
  for (const view of root.querySelectorAll<HTMLElement>('[data-ban-view]')) {
    const key = view.dataset.banView;
    if (key) views.set(key, view);
  }

  const setView = (nextView: BanView): void => {
    views.forEach((element, key) => {
      element.hidden = key !== nextView;
    });
  };

  const setSubmitting = (isSubmitting: boolean): void => {
    submitButton.disabled = isSubmitting;
    input.readOnly = isSubmitting;
  };

  const syncClear = (): void => {
    const hasValue = input.value.trim().length > 0;
    clearButton.classList.toggle('mg-search-clear--hidden', !hasValue);
    clearButton.tabIndex = hasValue ? 0 : -1;
  };

  const applyPlayer = (player: BanQueryPlayer | null): void => {
    setText(root, '[data-ban-player-name]', readText(player?.name, '-'));
    setText(root, '[data-ban-player-uuid]', readText(player?.uuid, '-'));
    setText(root, '[data-ban-player-source]', readText(player?.nameSource, 'Unbekannt'));
    setText(root, '[data-ban-player-first-seen]', formatIsoDate(player?.firstSeen ?? null));
    setText(root, '[data-ban-player-last-seen]', formatIsoDate(player?.lastSeen ?? null));
  };

  const applyBan = (ban: BanQueryBan | null): void => {
    const expiresAtText = ban?.isPermanent
      ? 'Kein Ablauf (permanent)'
      : formatIsoDate(ban?.expiresAt ?? null);

    setText(root, '[data-ban-reason]', readText(ban?.reason, 'Nicht angegeben'));
    setText(root, '[data-ban-by]', readText(ban?.bannedBy, 'Unbekannt'));
    setText(root, '[data-ban-at]', formatIsoDate(ban?.bannedAt ?? null));
    setText(root, '[data-ban-expires-at]', expiresAtText);
    setText(root, '[data-ban-is-permanent]', ban?.isPermanent ? 'Ja' : 'Nein');
  };

  let activeController: AbortController | null = null;
  let isDisposed = false;

  const requestBanStatus = async (
    query: string,
    options: { syncLocation?: boolean } = {},
  ): Promise<void> => {
    if (query.length === 0) {
      setView('idle');
      feedback.textContent = 'Suche nach einem Spieler, um den Bannstatus zu sehen.';
      if (options.syncLocation) syncQueryInLocation('');
      return;
    }

    if (options.syncLocation) {
      syncQueryInLocation(query);
    }

    if (activeController) {
      activeController.abort();
    }

    const controller = new AbortController();
    activeController = controller;
    setSubmitting(true);
    setView('loading');
    feedback.textContent = `Prüfe Bannstatus für "${query}"...`;

    try {
      const response = await fetch(toApiUrl(`/api/ban-status?query=${encodeURIComponent(query)}`), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API-Fehler (${response.status})`);
      }

      const data = (await response.json()) as BanQueryResponse;
      if (isDisposed || activeController !== controller) return;

      setText(root, '[data-ban-query-value]', readText(data.query, query));
      applyPlayer(data.player);
      applyBan(data.ban);

      if (data.status === 'unknown_player') {
        setView('unknown');
        feedback.textContent = `Kein bekannter Spieler gefunden: "${readText(data.query, query)}".`;
        return;
      }

      if (data.status === 'not_banned') {
        setView('not-banned');
        feedback.textContent = `Spieler "${readText(data.player?.name, query)}" ist aktuell nicht gebannt.`;
        return;
      }

      setView('banned');
      feedback.textContent = `Spieler "${readText(data.player?.name, query)}" ist aktuell gebannt.`;
    } catch (error) {
      const message = getMessageFromError(error);
      if (message === 'aborted' || isDisposed || activeController !== controller) return;

      setView('error');
      errorMessage.textContent = `Die Bannabfrage ist aktuell nicht verfügbar (${message}).`;
      feedback.textContent = 'Die Abfrage konnte nicht abgeschlossen werden.';
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
      setSubmitting(false);
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      void requestBanStatus('', { syncLocation: true });
      return;
    }
    void requestBanStatus(query, { syncLocation: true });
  };

  const onInput = (): void => {
    syncClear();
    if (input.value.trim().length > 0) return;
    activeController?.abort();
    activeController = null;
    setSubmitting(false);
    setView('idle');
    feedback.textContent = 'Suche nach einem Spieler, um den Bannstatus zu sehen.';
    syncQueryInLocation('');
  };

  const onRootClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('[data-ban-search-clear]');
    if (!trigger) return;
    if (clearButton.classList.contains('mg-search-clear--hidden')) return;

    event.preventDefault();
    input.value = '';
    onInput();
    input.focus();
  };

  const onClearKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    input.value = '';
    onInput();
    input.focus();
  };

  form.addEventListener('submit', onSubmit);
  input.addEventListener('input', onInput);
  root.addEventListener('click', onRootClick);
  clearButton.addEventListener('keydown', onClearKeydown);

  const initialQuery = getQueryFromLocation();
  if (initialQuery) {
    input.value = initialQuery;
    syncClear();
    void requestBanStatus(initialQuery);
  } else {
    syncClear();
  }

  return () => {
    isDisposed = true;
    activeController?.abort();
    form.removeEventListener('submit', onSubmit);
    input.removeEventListener('input', onInput);
    root.removeEventListener('click', onRootClick);
    clearButton.removeEventListener('keydown', onClearKeydown);
  };
}
