export type TutorialRoleIcon = 'Wrench' | 'Shield' | 'Video' | 'UserRound';
export type TutorialRoleKey = 'admin' | 'moderator' | 'streamer' | 'spieler';

export type TutorialRole = {
  key: TutorialRoleKey;
  label: string;
  description: string;
  color: `#${string}`;
  icon: TutorialRoleIcon;
};

export const tutorialRoles: readonly TutorialRole[] = [
  {
    key: 'admin',
    label: 'Admin',
    description: 'Kümmert sich um Technik und sorgt dafür, dass alles rund läuft.',
    color: '#E74C3C',
    icon: 'Wrench',
  },
  {
    key: 'moderator',
    label: 'Moderator',
    description: 'Ist bei Fragen für dich da und achtet fair auf die Regeln.',
    color: '#E67E22',
    icon: 'Shield',
  },
  {
    key: 'streamer',
    label: 'Streamer',
    description: 'Teilt regelmäßig Live-Momente aus der Gilde mit der Community.',
    color: '#9B59B6',
    icon: 'Video',
  },
  {
    key: 'spieler',
    label: 'Spieler',
    description: 'Spielt zusammen mit allen anderen und macht die Community lebendig.',
    color: '#3498DB',
    icon: 'UserRound',
  },
] as const;
