import { minecraftGilde } from '../config/minecraftGilde';
import { appRoutes } from '../config/routes';

const tutorialLinks = {
  rules: appRoutes.rules,
  commands: appRoutes.commands,
  vote: appRoutes.vote,
  dynmap: minecraftGilde.mapUrl,
  discord: minecraftGilde.discord.url,
} as const;

export type TutorialLinkTarget = keyof typeof tutorialLinks;
export type TutorialActionVariant = 'primary' | 'secondary' | 'ghost';
export type TutorialActionIcon = 'ArrowRight' | 'Shield' | 'Hammer' | 'Map' | 'Vote';

export type TutorialAction = {
  label: string;
  target: TutorialLinkTarget;
  variant: TutorialActionVariant;
  icon?: TutorialActionIcon;
};

type TutorialHowToStep = {
  name: string;
  text: string;
  target?: TutorialLinkTarget;
};

const EXTERNAL_TARGETS: ReadonlySet<TutorialLinkTarget> = new Set(['discord', 'dynmap']);

export const resolveTutorialLink = (target: TutorialLinkTarget): string => tutorialLinks[target];

export const isTutorialExternalTarget = (target: TutorialLinkTarget): boolean =>
  EXTERNAL_TARGETS.has(target);

export const tutorialHeaderIntro = {
  title: 'Tutorial',
  subtitle:
    'Neu auf der Minecraft Gilde? Hier zeigen wir dir Schritt für Schritt, wie du beitrittst, einen Bauplatz findest, dein Gebiet schützt und dein erstes Zuhause einrichtest.',
} as const;

export const tutorialHeaderActions: readonly TutorialAction[] = [
  {
    label: 'Discord',
    target: 'discord',
    variant: 'secondary',
    icon: 'ArrowRight',
  },
  {
    label: 'Regeln',
    target: 'rules',
    variant: 'ghost',
  },
];

export const tutorialQuickstart = {
  title: 'Schnellstart (2 Minuten)',
  subtitle: 'Das reicht für deinen ersten Abend:',
  steps: [
    {
      title: 'Verbinden',
      text: `Starte Minecraft Java Edition, wähle die Minecraft-Version ${minecraftGilde.minecraftVersion} und verbinde dich mit ${minecraftGilde.serverIp}.`,
    },
    {
      title: 'Bauplatz finden',
      text: 'Nutze /rtp, um dich zufällig in die Wildnis der Hauptwelt teleportieren zu lassen und einen Bauplatz zu suchen.',
    },
    {
      title: 'Zuhause setzen',
      text: 'Mit /sethome <name> speicherst du dein Home, mit /home <name> kommst du jederzeit zurück.',
    },
    {
      title: 'Claim erstellen',
      text: 'Schütze dein Baugebiet mit einem Claim, indem du mit einer Holzschaufel zwei gegenüberliegende Ecken per Rechtsklick markierst.',
    },
    {
      title: 'Farmwelt nutzen',
      text: 'Nutze /farmwelt für die Rohstoffbeschaffung in den Farmwelten; die Hauptwelt ist für langfristige Bauprojekte gedacht.',
    },
  ],
} as const;

export const tutorialQuickstartCallout = {
  title: 'Kleiner Hinweis',
  text: 'Bitte sammle Ressourcen in den Farmwelten, damit die Hauptwelt schön bleibt und langfristig Platz für Bauprojekte bietet.',
  variant: 'warning' as const,
} as const;

export const tutorialQuickstartActions: readonly TutorialAction[] = [
  {
    label: 'Live-Karte',
    target: 'dynmap',
    variant: 'ghost',
    icon: 'Map',
  },
  {
    label: 'Befehle',
    target: 'commands',
    variant: 'secondary',
  },
  {
    label: 'Voten',
    target: 'vote',
    variant: 'ghost',
  },
];

export const tutorialHowTo: {
  name: string;
  description: string;
  steps: readonly TutorialHowToStep[];
} = {
  name: 'Minecraft Gilde beitreten – dein Serverstart',
  description:
    'Starte mit Minecraft Java Edition auf der Minecraft Gilde: verbinden, mit /rtp einen Bauplatz finden, ein Home setzen, einen Claim erstellen und Farmwelten nutzen.',
  steps: [
    {
      name: 'Mit Minecraft Java Edition verbinden',
      text: `Starte Minecraft Java Edition, wähle die Minecraft-Version ${minecraftGilde.minecraftVersion} und verbinde dich mit ${minecraftGilde.serverIp} (Port 25565).`,
    },
    {
      name: 'Bauplatz mit /rtp finden',
      text: 'Nutze /rtp, um dich zufällig in die Wildnis der Hauptwelt teleportieren zu lassen und einen Bauplatz zu suchen.',
    },
    {
      name: 'Home setzen',
      text: 'Setze mit /sethome <name> ein Home, damit du mit /home <name> jederzeit zurückkommst.',
    },
    {
      name: 'Claim als Grundstücksschutz erstellen',
      text: 'Markiere mit einer Holzschaufel zwei gegenüberliegende Ecken per Rechtsklick, um deinen Claim zu erstellen.',
    },
    {
      name: 'Farmwelten für Rohstoffe nutzen',
      text: 'Nutze /farmwelt für die Rohstoffbeschaffung in den Farmwelten und die Hauptwelt für langfristige Bauprojekte.',
    },
    {
      name: 'Regeln prüfen',
      text: 'Lies die Regeln und beachte vor allem die Vorgaben zu Farmwelten und zum Community-Verhalten.',
      target: 'rules',
    },
  ],
} as const;

export const tutorialFinalCallout = {
  title: 'Noch Fragen?',
  text: 'Wenn noch etwas offen ist, frag im Spiel oder auf Discord – wir helfen dir gerne weiter.',
  variant: 'info' as const,
} as const;
