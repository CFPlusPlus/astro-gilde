// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StatsNavPills } from './StatsNavPills';

const mount = async (
  active: 'uebersicht' | 'king' | 'ranglisten' | 'versus',
  onChange: (tab: 'uebersicht' | 'king' | 'ranglisten' | 'versus') => void,
) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(StatsNavPills, {
        active,
        onChange,
        disabled: false,
        surface: false,
        layout: 'one-row',
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

describe('StatsNavPills', () => {
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

  it('rendert Tablist mit korrekten ARIA-Attributen', async () => {
    const { container, cleanup } = await mount('uebersicht', vi.fn());
    const tabList = container.querySelector('[role="tablist"]');
    const tabs = container.querySelectorAll('[role="tab"]');
    const activeTab = container.querySelector('[role="tab"][aria-selected="true"]');

    expect(tabList).not.toBeNull();
    expect(tabs.length).toBe(4);
    expect(activeTab?.getAttribute('id')).toBe('stats-tab-uebersicht');
    expect(activeTab?.getAttribute('aria-controls')).toBe('stats-panel-uebersicht');

    await cleanup();
  });

  it('wechselt per Pfeiltasten zwischen Tabs', async () => {
    const onChange = vi.fn();
    const { container, cleanup } = await mount('uebersicht', onChange);
    const firstTab = container.querySelector<HTMLButtonElement>('#stats-tab-uebersicht');
    expect(firstTab).not.toBeNull();

    await act(async () => {
      firstTab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith('king');

    await cleanup();
  });
});
