import { describe, expect, it } from 'vitest';

import { rankPlayersForQuery } from './player-search';
import type { PlayersSearchItem } from './types';

describe('rankPlayersForQuery', () => {
  it('findet Teilstrings aus bekannten Treffern', () => {
    const apiItems: PlayersSearchItem[] = [];
    const knownItems: PlayersSearchItem[] = [{ uuid: '1', name: 'Schirkoy' }];

    const result = rankPlayersForQuery('hirk', apiItems, knownItems, 6);

    expect(result.map((item) => item.name)).toEqual(['Schirkoy']);
  });

  it('findet vertauschte Buchstaben ueber Fuzzy-Match', () => {
    const apiItems: PlayersSearchItem[] = [];
    const knownItems: PlayersSearchItem[] = [{ uuid: '1', name: 'Schirkoy' }];

    const result = rankPlayersForQuery('iroky', apiItems, knownItems, 6);

    expect(result.map((item) => item.name)).toEqual(['Schirkoy']);
  });

  it('behaelt API-Treffer, auch wenn lokal kein besserer Match existiert', () => {
    const apiItems: PlayersSearchItem[] = [{ uuid: '2', name: 'Alpha' }];
    const knownItems: PlayersSearchItem[] = [{ uuid: '1', name: 'Schirkoy' }];

    const result = rankPlayersForQuery('zzzz', apiItems, knownItems, 6);

    expect(result.map((item) => item.name)).toEqual(['Alpha']);
  });
});
