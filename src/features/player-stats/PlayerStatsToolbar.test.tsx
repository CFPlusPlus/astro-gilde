// @vitest-environment jsdom

import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlayerStatsToolbar } from './PlayerStatsToolbar';

const mount = async (
  activeTab: 'allgemein' | 'items' | 'mobs',
  setActiveTab: (next: 'allgemein' | 'items' | 'mobs') => void,
) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(PlayerStatsToolbar, {
        activeTab,
        setActiveTab,
        filterRaw: '',
        setFilterRaw: vi.fn(),
        filterInputRef: createRef<HTMLInputElement>(),
        activeResultCount: 5,
        activeTabLabel: 'Allgemein',
      }),
    );
  });

  const cleanup = async (): Promise<void> => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  };

  return { container, cleanup };
};

describe('PlayerStatsToolbar', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = false;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('rendert Tabs mit ARIA-Verknuepfung', async () => {
    const { container, cleanup } = await mount('allgemein', vi.fn());
    const tabList = container.querySelector('[role="tablist"]');
    const activeTab = container.querySelector('[role="tab"][aria-selected="true"]');

    expect(tabList).not.toBeNull();
    expect(activeTab?.getAttribute('id')).toBe('player-stats-tab-allgemein');
    expect(activeTab?.getAttribute('aria-controls')).toBe('player-stats-panel-allgemein');

    await cleanup();
  });

  it('wechselt Tabs per ArrowRight', async () => {
    const setActiveTab = vi.fn();
    const { container, cleanup } = await mount('allgemein', setActiveTab);
    const firstTab = container.querySelector<HTMLButtonElement>('#player-stats-tab-allgemein');
    expect(firstTab).not.toBeNull();

    await act(async () => {
      firstTab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(setActiveTab).toHaveBeenCalledWith('items');

    await cleanup();
  });
});
