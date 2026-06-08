// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPlayer, getTranslations } from '../stats-core/api';
import { usePlayerStatsState, type UsePlayerStatsState } from './usePlayerStatsState';

vi.mock('../stats-core/api', () => ({
  getPlayer: vi.fn(),
  getTranslations: vi.fn(),
}));

const mockedGetPlayer = vi.mocked(getPlayer);
const mockedGetTranslations = vi.mocked(getTranslations);

function PlayerStatsStateProbe({ onState }: { onState: (state: UsePlayerStatsState) => void }) {
  const state = usePlayerStatsState();

  useEffect(() => {
    onState(state);
  }, [onState, state]);

  return null;
}

async function waitForExpectation(assertion: () => void): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 10));
      });
    }
  }

  throw lastError;
}

describe('usePlayerStatsState', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let latestState: UsePlayerStatsState | null = null;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(
      {},
      '',
      '/statistiken/spieler/?uuid=12345678123412341234123456789012',
    );
    mockedGetTranslations.mockResolvedValue({});
    latestState = null;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('zeigt eine klare Meldung, wenn ein bekannter Spieler noch keine Statistiken hat', async () => {
    mockedGetPlayer.mockResolvedValue({
      found: true,
      uuid: '12345678-1234-1234-1234-123456789012',
      name: 'OnlinePlayer',
      player: null,
    });

    await act(async () => {
      root?.render(
        createElement(PlayerStatsStateProbe, {
          onState: (state: UsePlayerStatsState) => {
            latestState = state;
          },
        }),
      );
    });

    await waitForExpectation(() => {
      expect(latestState?.apiError).toContain('noch keine Spielerstatistiken');
    });

    expect(latestState?.playerName).toBe('OnlinePlayer');
    expect(latestState?.stats).toBeNull();
  });
});
