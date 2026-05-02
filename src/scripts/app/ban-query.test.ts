import { describe, expect, it } from 'vitest';

import { buildBannedPlayerNameInfo } from './ban-query';

describe('buildBannedPlayerNameInfo', () => {
  it('hebt aktuellen Namen und Ban-Namen bei Namensaenderung hervor', () => {
    expect(
      buildBannedPlayerNameInfo({ name: 'CurrentName' }, { nameAtBan: 'OldName' }),
    ).toMatchObject({
      detailName: 'CurrentName',
      currentName: 'CurrentName',
      nameAtBan: 'OldName',
      showNameChangeNotice: true,
      showCurrentName: true,
      showNameAtBan: true,
    });
  });

  it('zeigt identische Namen nicht doppelt', () => {
    expect(
      buildBannedPlayerNameInfo({ name: 'CurrentName' }, { nameAtBan: 'CurrentName' }),
    ).toMatchObject({
      detailName: 'CurrentName',
      currentName: 'CurrentName',
      showNameChangeNotice: false,
      showCurrentName: true,
      showNameAtBan: false,
    });
  });

  it('faellt ohne aktuellen Namen auf den Ban-Namen zurueck', () => {
    expect(buildBannedPlayerNameInfo(null, { nameAtBan: 'OldName' })).toMatchObject({
      detailName: 'OldName',
      nameAtBan: 'OldName',
      showNameChangeNotice: false,
      showCurrentName: false,
      showNameAtBan: false,
    });
  });
});
