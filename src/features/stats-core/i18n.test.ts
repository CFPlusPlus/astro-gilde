import { afterEach, describe, expect, it, vi } from 'vitest';

import { logMissingTranslations } from './i18n';

describe('logMissingTranslations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs missing translation keys when enabled', () => {
    const stats: Record<string, unknown> = {
      'minecraft:custom': {
        'minecraft:play_time': 1,
      },
      'minecraft:mined': {
        'minecraft:stone': 1,
      },
      'minecraft:killed': {
        'minecraft:zombie': 1,
      },
    };

    const translations = {
      stats: {},
      items: {},
      mobs: {},
    };

    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    logMissingTranslations(stats, translations, { enabled: true });

    expect(groupSpy).toHaveBeenCalledWith('Übersetzungsprüfung');
    expect(infoSpy).toHaveBeenCalledWith('Fehlende Stats:', ['minecraft:play_time']);
    expect(infoSpy).toHaveBeenCalledWith('Fehlende Items:', ['minecraft:stone']);
    expect(infoSpy).toHaveBeenCalledWith('Fehlende Mobs:', ['minecraft:zombie']);
    expect(groupEndSpy).toHaveBeenCalledTimes(1);
  });

  it('does not log when disabled', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    logMissingTranslations({}, null, { enabled: false });

    expect(groupSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(groupEndSpy).not.toHaveBeenCalled();
  });
});
