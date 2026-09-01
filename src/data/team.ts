export type TeamMember = {
  uuid: string;
  inGameName: string;
  role: string;
  group: 'admin' | 'moderator' | 'streamer';
};

export const TEAM_GROUPS: Array<{ key: TeamMember['group']; label: string }> = [
  { key: 'admin', label: 'Admins' },
  { key: 'moderator', label: 'Moderatoren' },
  { key: 'streamer', label: 'Streamer' },
];

// Quelle: bisherige Konfiguration (public/js/script.js)
// UUIDs werden fuer Koepfe stabil gehalten, der Anzeigename bleibt redaktionell gepflegt.
export const TEAM_MEMBERS: TeamMember[] = [
  {
    uuid: '8bb522ddad894727991cc562022587cd',
    inGameName: 'lestructor',
    role: 'Admin',
    group: 'admin',
  },
  {
    uuid: '93d4439c30c14d35a9e939978d436ede',
    inGameName: 'SCHIROKY',
    role: 'Admin',
    group: 'admin',
  },

  {
    uuid: '8acdac8906524af1ad8e3aadfcfa333a',
    inGameName: 'Fianaa',
    role: 'Moderator',
    group: 'moderator',
  },
  {
    uuid: '87f8fa046d414b66b61f4dd26bdc09a6',
    inGameName: 'W4ldi',
    role: 'Moderator',
    group: 'moderator',
  },
  {
    uuid: '7067d3cda4614efdae4e6fad16d958fa',
    inGameName: 'Wurmknoten',
    role: 'Moderator',
    group: 'moderator',
  },
  {
    uuid: 'd410e7f3c2084ca8badfec3b73311e5e',
    inGameName: 'MasterBenn',
    role: 'Moderator',
    group: 'moderator',
  },
  {
    uuid: 'd8fe315de1e74a9b9bb88a66b7b46391',
    inGameName: 'Niclasweh',
    role: 'Moderator',
    group: 'moderator',
  },
  {
    uuid: '302f9fc42ed94f4db3fc036a389403fd',
    inGameName: 'Snooc85',
    role: 'Moderator',
    group: 'moderator',
  },
  {
    uuid: 'b34cdff5d7394c568e51c5077206a6df',
    inGameName: 'MissMoFi',
    role: 'Moderator',
    group: 'moderator',
  },
];
