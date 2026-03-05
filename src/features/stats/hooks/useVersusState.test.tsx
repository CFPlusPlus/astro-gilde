// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPlayer, getTranslations } from '../../stats-core/api';
import type { PlayerApiResponse } from '../../stats-core/types';
import { useVersusState } from './useVersusState';

vi.mock('../../stats-core/api', () => ({
  getPlayer: vi.fn(),
  getTranslations: vi.fn(),
}));

vi.mock('../usePlayerAutocomplete', () => ({
  usePlayerAutocomplete: vi.fn(() => ({
    value: '',
    setValue: vi.fn(),
    setValueWithoutAutoOpen: vi.fn(),
    items: [],
    setItems: vi.fn(),
    open: false,
    setOpen: vi.fn(),
    selectedIndex: -1,
    setSelectedIndex: vi.fn(),
    wrapRef: { current: null },
    isLoading: false,
    errorMessage: null,
  })),
}));

type HookResult = ReturnType<typeof useVersusState>;

function HookHarness({ onRender }: { onRender: (value: HookResult) => void }) {
  const value = useVersusState({
    onGeneratedIso: () => {},
    initialState: {
      playerA: { uuid: 'uuid-a', name: 'Alice' },
      playerB: { uuid: 'uuid-b', name: 'Bob' },
    },
  });
  onRender(value);
  return null;
}

const flushEffects = async (cycles = 1): Promise<void> => {
  for (let index = 0; index < cycles; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const mountHook = async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  let latest: HookResult | null = null;

  await act(async () => {
    root.render(
      createElement(HookHarness, {
        onRender: (value: HookResult) => {
          latest = value;
        },
      }),
    );
  });

  const getLatest = (): HookResult => {
    if (!latest) throw new Error('Hook hat noch keinen Zustand geliefert.');
    return latest;
  };

  const unmount = async (): Promise<void> => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  };

  return {
    getLatest,
    unmount,
  };
};

describe('useVersusState request races', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.mocked(getPlayer).mockReset();
    vi.mocked(getTranslations).mockReset();
    vi.mocked(getTranslations).mockResolvedValue({});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = false;
    vi.restoreAllMocks();
  });

  it('keeps loading=true for the newest compare request while an older request finalizes', async () => {
    let playerCallCount = 0;
    const secondRequestResolvers: Array<(value: PlayerApiResponse) => void> = [];

    vi.mocked(getPlayer).mockImplementation((_uuid, signal) => {
      playerCallCount += 1;

      if (playerCallCount <= 2) {
        return new Promise((_, reject) => {
          const abort = () => reject(new DOMException('aborted', 'AbortError'));
          if (signal?.aborted) {
            abort();
            return;
          }
          signal?.addEventListener('abort', abort, { once: true });
        });
      }

      return new Promise((resolve) => {
        secondRequestResolvers.push(resolve);
      });
    });

    const hook = await mountHook();
    await flushEffects(1);

    await act(async () => {
      void hook.getLatest().runVersusCompare();
    });
    await flushEffects(1);
    expect(hook.getLatest().versusLoading).toBe(true);

    await act(async () => {
      void hook.getLatest().runVersusCompare();
    });
    await flushEffects(2);
    expect(hook.getLatest().versusLoading).toBe(true);

    await act(async () => {
      secondRequestResolvers[0]?.({
        found: true,
        uuid: 'uuid-a',
        name: 'Alice',
        player: { 'minecraft:custom': {} },
      });
      secondRequestResolvers[1]?.({
        found: true,
        uuid: 'uuid-b',
        name: 'Bob',
        player: { 'minecraft:custom': {} },
      });
      await Promise.resolve();
    });
    await flushEffects(2);
    expect(hook.getLatest().versusLoading).toBe(false);

    await hook.unmount();
  });
});
