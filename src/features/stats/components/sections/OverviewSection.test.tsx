// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OverviewSection } from './OverviewSection';

type OverviewOverrides = Partial<ComponentProps<typeof OverviewSection>>;

async function mountOverview(overrides: OverviewOverrides = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  const props: ComponentProps<typeof OverviewSection> = {
    showWelcome: false,
    onDismissWelcome: vi.fn(),
    onOpenRankings: vi.fn(),
    navigationDisabled: false,
    totals: {
      hours: 123,
      distance: 456,
      mob_kills: 789,
      creeper: 321,
    },
    summaryLoaded: true,
    summaryLoading: false,
    summaryError: null,
    onRetrySummary: vi.fn(),
    summaryRetryDisabled: false,
    summaryRetryInSeconds: 0,
    ...overrides,
  };

  await act(async () => {
    root.render(createElement(OverviewSection, props));
  });

  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('OverviewSection', () => {
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

  it('opens ranking deep-link via KPI cards', async () => {
    const onOpenRankings = vi.fn();
    const view = await mountOverview({ onOpenRankings });

    const leadCard = view.container.querySelector(
      '[aria-label="Spielzeit Rangliste \u00f6ffnen"]',
    ) as HTMLElement | null;
    expect(leadCard).not.toBeNull();

    await act(async () => {
      leadCard?.click();
    });

    const rowCard = view.container.querySelector(
      '[aria-label="Zur\u00fcckgelegte Strecke Rangliste \u00f6ffnen"]',
    ) as HTMLElement | null;
    expect(rowCard).not.toBeNull();

    await act(async () => {
      rowCard?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onOpenRankings).toHaveBeenCalledTimes(2);
    expect(onOpenRankings).toHaveBeenNthCalledWith(1, 'hours');
    expect(onOpenRankings).toHaveBeenNthCalledWith(2, 'distance');

    await view.cleanup();
  });

  it('triggers quicklinks for popular rankings', async () => {
    const onOpenRankings = vi.fn();
    const view = await mountOverview({
      onOpenRankings,
    });

    const buttons = Array.from(view.container.querySelectorAll('button'));
    const findQuicklinkButton = (label: string): HTMLButtonElement | undefined =>
      buttons.find((button) => (button.textContent || '').includes(label));
    const diamondButton = findQuicklinkButton('Diamanterz abgebaut');
    const openChestButton = findQuicklinkButton('Truhen ge\u00f6ffnet');
    const sleepInBedButton = findQuicklinkButton('Im Bett geschlafen');

    expect(diamondButton?.textContent).toContain('Diamanterz abgebaut');
    expect(openChestButton?.textContent).toContain('Truhen ge\u00f6ffnet');
    expect(sleepInBedButton?.textContent).toContain('Im Bett geschlafen');

    await act(async () => {
      diamondButton?.click();
      openChestButton?.click();
      sleepInBedButton?.click();
    });

    expect(onOpenRankings).toHaveBeenCalledTimes(3);
    expect(onOpenRankings).toHaveBeenNthCalledWith(1, [
      'diamond_ore',
      'minecraft:diamond_ore',
      'diamond',
    ]);
    expect(onOpenRankings).toHaveBeenNthCalledWith(2, [
      'open_chest',
      'minecraft:open_chest',
      'stat:minecraft:open_chest',
    ]);
    expect(onOpenRankings).toHaveBeenNthCalledWith(3, [
      'sleep_in_bed',
      'minecraft:sleep_in_bed',
      'stat:minecraft:sleep_in_bed',
    ]);

    await view.cleanup();
  });
});
