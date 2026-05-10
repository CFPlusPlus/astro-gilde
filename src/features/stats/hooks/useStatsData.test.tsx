// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LIVE_COPY_DE } from '../../../lib/live/copy.de';
import { getLiveResource } from '../../../lib/live/cache';
import type { LiveDataState } from '../../../lib/live/types';
import { getLeaderboard, getMetrics, getSummary, getWorldState } from '../api';
import type { SummaryResponse } from '../types';
import type { TabKey } from '../types-ui';
import { useStatsData } from './useStatsData';

vi.mock('../api', () => ({
  getLeaderboard: vi.fn(),
  getMetrics: vi.fn(),
  getSummary: vi.fn(),
  getWorldState: vi.fn(),
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
  let currentProps: HookProps = props;

  const renderWithProps = async (nextProps: HookProps): Promise<void> => {
    await act(async () => {
      root.render(
        createElement(HookHarness, {
          ...nextProps,
          onRender: (value: HookResult) => {
            latest = value;
          },
        }),
      );
    });
  };

  await renderWithProps(currentProps);

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

  const update = async (next: Partial<HookProps>): Promise<void> => {
    currentProps = {
      ...currentProps,
      ...next,
    };
    await renderWithProps(currentProps);
  };

  return {
    getLatest,
    update,
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
    vi.mocked(getWorldState).mockReset();
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
    expect(getLiveResource).toHaveBeenCalledTimes(0);

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
    expect(getLiveResource).toHaveBeenCalledTimes(0);

    await hook.unmount();
  });

  it('loads overview live resources on initial overview tab', async () => {
    const hook = await mountHook({
      activeTab: 'uebersicht',
      pageSize: 10,
      metricFilter: '',
      initialActiveMetricId: null,
    });

    await flushEffects(3);

    expect(getLiveResource).toHaveBeenCalledTimes(2);
    expect(getMetrics).not.toHaveBeenCalled();
    expect(getLeaderboard).not.toHaveBeenCalled();

    await hook.unmount();
  });

  it('keeps king errors stable instead of retrying in a loop', async () => {
    vi.mocked(getLeaderboard).mockRejectedValue({
      status: 500,
      message: 'HTTP 500',
    });

    const hook = await mountHook({
      activeTab: 'king',
      pageSize: 10,
      metricFilter: '',
      initialActiveMetricId: null,
    });

    await flushEffects(5);

    expect(getLeaderboard).toHaveBeenCalledTimes(1);
    expect(hook.getLatest().king.liveStatus).toBe('error');
    expect(hook.getLatest().king.lastAttemptedPageSize).toBe(10);

    await hook.unmount();
  });

  it('keeps apiError hidden while an initial cached summary error is revalidating', async () => {
    let resolveRevalidate: ((value: LiveDataState<SummaryResponse>) => void) | null = null;
    const revalidate = new Promise<LiveDataState<SummaryResponse>>((resolve) => {
      resolveRevalidate = resolve;
    });

    vi.mocked(getLiveResource).mockReturnValueOnce({
      state: {
        status: 'error',
        fetchedAt: 1_000,
        error: {
          kind: 'network',
          message: 'Kurzzeitig nicht erreichbar',
        },
      },
      revalidate,
    });

    const hook = await mountHook({
      activeTab: 'uebersicht',
      pageSize: 10,
      metricFilter: '',
      initialActiveMetricId: null,
    });

    await flushEffects(2);

    const pendingState = hook.getLatest();
    expect(pendingState.summaryLoading).toBe(true);
    expect(pendingState.summaryError).toBeNull();
    expect(pendingState.apiError).toBeNull();

    await act(async () => {
      resolveRevalidate?.({
        status: 'ok',
        data: {
          player_count: 12,
          totals: {
            hours: 120,
          },
          __generated: '2026-02-19T12:00:01.000Z',
        },
        updatedAt: 2_000,
        fetchedAt: 2_000,
      });
      await Promise.resolve();
    });

    await flushEffects(2);

    const nextState = hook.getLatest();
    expect(nextState.summaryLoading).toBe(false);
    expect(nextState.summaryError).toBeNull();
    expect(nextState.apiError).toBeNull();

    await hook.unmount();
  });

  it('prefetches rankings in background without tab switch', async () => {
    vi.mocked(getMetrics).mockResolvedValue({
      metrics: {
        hours: { label: 'Spielzeit', category: 'Aktivitaet' },
      },
    });
    vi.mocked(getLeaderboard).mockResolvedValue({
      boards: {
        hours: [{ uuid: 'uuid-1', value: 123 }],
      },
      cursors: {
        hours: null,
      },
    });

    const hook = await mountHook({
      activeTab: 'uebersicht',
      pageSize: 10,
      metricFilter: '',
      initialActiveMetricId: null,
    });

    await flushEffects(2);

    await act(async () => {
      await hook.getLatest().prefetchRankings();
    });

    await flushEffects(2);

    expect(getMetrics).toHaveBeenCalledTimes(1);
    expect(getLeaderboard).toHaveBeenCalledTimes(1);

    await hook.unmount();
  });

  it('keeps rankings errors stable instead of retrying in a loop', async () => {
    vi.mocked(getMetrics).mockResolvedValue({
      metrics: {
        hours: { label: 'Spielzeit', category: 'Aktivitaet' },
      },
    });
    vi.mocked(getLeaderboard).mockRejectedValue({
      status: 500,
      message: 'HTTP 500',
    });

    const hook = await mountHook({
      activeTab: 'ranglisten',
      pageSize: 10,
      metricFilter: '',
      initialActiveMetricId: 'hours',
    });

    await flushEffects(5);

    expect(getMetrics).toHaveBeenCalledTimes(1);
    expect(getLeaderboard).toHaveBeenCalledTimes(1);
    expect(hook.getLatest().activeMetricState.liveStatus).toBe('error');
    expect(hook.getLatest().activeMetricState.lastAttemptedPageSize).toBe(10);

    await hook.unmount();
  });

  it('keeps the requested page size on stale responses and revalidates with the latest size', async () => {
    type LeaderboardResponse = {
      boards?: Record<string, Array<{ uuid: string; value: number }>>;
      cursors?: Record<string, string | null>;
    };
    const pending: Array<{
      limit: number;
      resolve: (value: LeaderboardResponse) => void;
    }> = [];

    vi.mocked(getLeaderboard).mockImplementation((_metricId, limit) => {
      return new Promise<LeaderboardResponse>((resolve) => {
        pending.push({ limit, resolve });
      });
    });

    const hook = await mountHook({
      activeTab: 'king',
      pageSize: 10,
      metricFilter: '',
      initialActiveMetricId: null,
    });

    await flushEffects(2);
    expect(pending).toHaveLength(1);
    expect(pending[0].limit).toBe(10);

    await hook.update({ pageSize: 30 });
    await flushEffects(1);
    expect(getLeaderboard).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending[0].resolve({
        boards: {
          king: [{ uuid: 'uuid-1', value: 42 }],
        },
        cursors: {
          king: null,
        },
      });
      await Promise.resolve();
    });

    await flushEffects(2);
    expect(hook.getLatest().king.pageSize).toBe(10);
    expect(getLeaderboard).toHaveBeenCalledTimes(2);
    expect(pending).toHaveLength(2);
    expect(pending[1].limit).toBe(30);

    await hook.unmount();
  });
});
