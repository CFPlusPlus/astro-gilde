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
    description: 'Technik und Verwaltung.',
    color: '#E74C3C',
    icon: 'Wrench',
  },
  {
    key: 'moderator',
    label: 'Moderator',
    description: 'Hilft Spielern und achtet auf die Regeln.',
    color: '#E67E22',
    icon: 'Shield',
  },
  {
    key: 'streamer',
    label: 'Streamer',
    description: 'Spieler, die regelmäßig live streamen.',
    color: '#9B59B6',
    icon: 'Video',
  },
  {
    key: 'spieler',
    label: 'Spieler',
    description: 'Normale Mitglieder der Community.',
    color: '#3498DB',
    icon: 'UserRound',
  },
] as const;
