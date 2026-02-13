import type { AnchorItem } from '../../components/home/HomeQuickNav.astro';

// Onepager-Sprungnavigation (Startseite)
// Hinweis: Als eigene Datei, damit index.astro und Komponenten übersichtlich bleiben.

export const HOME_ANCHORS: AnchorItem[] = [
  { href: '#about', label: "Worum geht's?" },
  { href: '#vanilla', label: 'Vanilla+' },
  { href: '#start', label: 'Start' },
  { href: '#live', label: 'Live' },
  { href: '#support', label: 'Voting & Hilfe' },
  { href: '#links', label: 'Mehr' },
  { href: '#join', label: 'Join' },
];
