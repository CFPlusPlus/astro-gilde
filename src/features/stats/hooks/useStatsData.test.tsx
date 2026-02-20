// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LIVE_COPY_DE } from '../../../lib/live/copy.de';
import { getLiveResource } from '../../../lib/live/cache';
import { getLeaderboard, getMetrics, getSummary } from '../api';
import type { TabKey } from '../types-ui';
import { useStatsData } from './useStatsData';

vi.mock('../api', () => ({
  getLeaderboard: vi.fn(),
  getMetrics: vi.fn(),
  getSummary: vi.fn(),
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

vi.mock('../../../lib/live/cache', () => ({
  getLiveResource: vi.fn(() => ({
    state: {
      status: 'ok',
      data: {},
      updatedAt: 1_000,
      fetchedAt: 1_000,
    },
    revalidate: null,
  })),
}));

type HookProps = {
  activeTab: TabKey;
  pageSize: number;
  metricFilter: string;
  initialActiveMetricId?: string | null;
};

type HookResult = ReturnType<typeof useStatsData>;

function HookHarness({
  onRender,
  ...props
}: HookProps & {
  onRender: (value: HookResult) => void;
}) {
  const value = useStatsData(props);
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

const mountHook = async (props: HookProps) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  let latest: HookResult | null = null;

  await act(async () => {
    root.render(
      createElement(HookHarness, {
        ...props,
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

describe('useStatsData rate limit', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));
    vi.mocked(getLeaderboard).mockReset();
    vi.mocked(getMetrics).mockReset();
    vi.mocked(getSummary).mockReset();
    vi.mocked(getLiveResource).mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = false;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sets nextAllowedFetchAt after 429 and blocks further revalidations', async () => {
    vi.mocked(getLeaderboard).mockRejectedValue({
      status: 429,
      retryAfterMs: 5_000,
      message: 'HTTP 429',
    });

    const hook = await mountHook({
      activeTab: 'king',
      pageSize: 10,
      metricFilter: '',
      initialActiveMetricId: null,
    });

    await flushEffects(4);

    expect(getLeaderboard).toHaveBeenCalledTimes(1);
    expect(getLiveResource).toHaveBeenCalledTimes(1);

    const blockedState = hook.getLatest();
    expect(blockedState.summaryRetryDisabled).toBe(true);
    expect(blockedState.summaryRetryInSeconds).toBe(5);
    expect(blockedState.apiError).toContain(LIVE_COPY_DE.retry_in(5));

    await act(async () => {
      blockedState.retrySummary();
      await blockedState.loadMoreKing();
    });

    await flushEffects(2);
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });

    expect(getLeaderboard).toHaveBeenCalledTimes(1);
    expect(getLiveResource).toHaveBeenCalledTimes(1);

    await hook.unmount();
  });
});
