// @vitest-environment jsdom

import { act, createElement, useRef, useState, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayersSearchItem } from '../types';
import { PlayerSearchCombobox } from './PlayerSearchCombobox';

type HarnessProps = {
  items: PlayersSearchItem[];
  onChoose: (uuid: string) => void;
  initialValue?: string;
  initialOpen?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
};

function Harness({
  items,
  onChoose,
  initialValue = 'ab',
  initialOpen = true,
  isLoading = false,
  errorMessage = null,
}: HarnessProps) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(initialOpen);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  return createElement(PlayerSearchCombobox, {
    value,
    onChange: setValue,
    items,
    open,
    onOpenChange: setOpen,
    selectedIndex,
    onSelectedIndexChange: setSelectedIndex,
    onChoose,
    wrapRef: wrapRef as RefObject<HTMLDivElement | null>,
    isLoading,
    errorMessage,
  });
}

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

const mount = async (props: HarnessProps) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(createElement(Harness, props));
  });

  const cleanup = async (): Promise<void> => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  };

  return { container, cleanup };
};

describe('PlayerSearchCombobox', () => {
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

  it('waehlt Treffer per Tastatur mit ArrowDown und Enter', async () => {
    const onChoose = vi.fn();
    const { container, cleanup } = await mount({
      items: [
        { uuid: 'uuid-a', name: 'Alpha' },
        { uuid: 'uuid-b', name: 'Beta' },
      ],
      onChoose,
    });

    const input = container.querySelector('input[role="combobox"]');
    expect(input).not.toBeNull();

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    await flush();

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('uuid-a');

    await cleanup();
  });

  it('schliesst die Liste per Escape', async () => {
    const onChoose = vi.fn();
    const { container, cleanup } = await mount({
      items: [{ uuid: 'uuid-a', name: 'Alpha' }],
      onChoose,
    });

    const input = container.querySelector('input[role="combobox"]');
    expect(input?.getAttribute('aria-expanded')).toBe('true');

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await flush();

    expect(input?.getAttribute('aria-expanded')).toBe('false');

    await cleanup();
  });

  it('waehlt markierten Treffer per Tab', async () => {
    const onChoose = vi.fn();
    const { container, cleanup } = await mount({
      items: [{ uuid: 'uuid-a', name: 'Alpha' }],
      onChoose,
    });

    const input = container.querySelector('input[role="combobox"]');

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    await flush();

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    await flush();

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('uuid-a');
    expect(input?.getAttribute('aria-expanded')).toBe('false');

    await cleanup();
  });

  it('zeigt Empty-, Loading- und Error-Status', async () => {
    const empty = await mount({ items: [], onChoose: vi.fn() });
    expect(empty.container.textContent).toMatch(
      /Kein Treffer\.\s*Pr(?:ue|\u00FC)fe die Schreibweise oder gib mehr Zeichen ein\./,
    );
    await empty.cleanup();

    const loading = await mount({ items: [], onChoose: vi.fn(), isLoading: true });
    expect(loading.container.textContent).toMatch(/Suche l(?:ae|\u00E4)uft\.\.\./);
    await loading.cleanup();

    const error = await mount({
      items: [],
      onChoose: vi.fn(),
      errorMessage: 'Live-Daten sind aktuell nicht erreichbar.',
    });
    expect(error.container.textContent).toContain('Live-Daten sind aktuell nicht erreichbar.');
    await error.cleanup();
  });
});
