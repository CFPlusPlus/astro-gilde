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
    'In 2 Minuten startklar - darunter findest du alle Themen als Kapitel zum Nachschlagen.',
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
      text: `Verbinde dich mit ${minecraftGilde.serverIp}, schau kurz am Spawn vorbei und nutze dann /rtp.`,
    },
    {
      title: 'Zuhause setzen',
      text: 'Mit /sethome <Name> speicherst du deinen Startpunkt, mit /home <Name> kommst du jederzeit zurück.',
    },
    {
      title: 'Claim erstellen',
      text: 'Nimm eine Holzschaufel und markiere zwei Ecken per Rechtsklick.',
    },
    {
      title: 'Nur in Farmwelten abbauen',
      text: 'Farmen in der Oberwelt ist verboten. Nutze dafür den Befehl /farmwelt.',
    },
  ],
} as const;

export const tutorialQuickstartCallout = {
  title: 'Wichtige Regel',
  text: 'Farmen in der Oberwelt ist verboten. Ressourcen bitte ausschließlich in den Farmwelten abbauen.',
  variant: 'warning' as const,
} as const;

export const tutorialQuickstartActions: readonly TutorialAction[] = [
  {
    label: 'Dynmap',
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
  name: 'Minecraft Gilde beitreten - Erststart in 2 Minuten',
  description:
    'Kompakter Einstieg: verbinden, /rtp nutzen, Zuhause setzen, Grundstück sichern und wichtige Regeln kennen.',
  steps: [
    {
      name: 'Mit dem Server verbinden',
      text: `Starte Minecraft Java (${minecraftGilde.mcVersion}) und verbinde dich mit ${minecraftGilde.serverIp} (Port 25565).`,
    },
    {
      name: 'Startpunkt wählen',
      text: 'Nutze /rtp, um dich in die Hauptwelt zu teleportieren und direkt einen Bauplatz zu suchen.',
    },
    {
      name: 'Zuhause setzen',
      text: 'Setze mit /sethome <Name> ein Home, damit du mit /home <Name> jederzeit zurückkommst.',
    },
    {
      name: 'Grundstück sichern',
      text: 'Halte eine Holzschaufel und markiere zwei Ecken per Rechtsklick, um deinen Claim zu erstellen.',
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
  text: 'Wenn noch etwas offen ist, frag im Spiel oder auf Discord - wir helfen dir gerne weiter.',
  variant: 'info' as const,
} as const;
