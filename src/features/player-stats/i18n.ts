import type { PlayerTranslations } from './types';

function rawFallback(rawId: string): string {
  return rawId.replace(/^minecraft:/, '').replaceAll('_', ' ');
}

/**
 * Uebersetzungs-Helper
 * - wenn DE aktiv: Uebersetzung versuchen, sonst Fallback
 * - wenn EN/Original aktiv: immer das "Raw" anzeigen
 */
export function tLabel(
  rawId: string,
  kind: 'stat' | 'item' | 'mob',
  isGerman: boolean,
  translations: PlayerTranslations | null,
): string {
  if (!isGerman) return rawFallback(rawId);

  if (kind === 'stat' && translations?.stats?.[rawId]) return translations.stats[rawId];
  if (kind === 'item' && translations?.items?.[rawId]) return translations.items[rawId];
  if (kind === 'mob' && translations?.mobs?.[rawId]) return translations.mobs[rawId];

  return rawFallback(rawId);
}

/**
 * Pruefroutine: zeigt fehlende Uebersetzungen in der Konsole (hilft beim Pflegeaufwand).
 * In Produktion ist das unkritisch, aber sehr hilfreich beim Nachpflegen.
 */
export function logMissingTranslations(
  stats: Record<string, unknown>,
  translations: PlayerTranslations | null,
) {
  if (!stats) return;

  const missing = {
    stats: new Set<string>(),
    items: new Set<string>(),
    mobs: new Set<string>(),
  };

  const asObj = (v: unknown) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

  const custom = asObj((stats as Record<string, unknown>)['minecraft:custom']);
  if (custom) {
    for (const key of Object.keys(custom)) {
      if (!translations?.stats?.[key]) missing.stats.add(key);
    }
  }

  const itemSections = [
    'minecraft:used',
    'minecraft:mined',
    'minecraft:crafted',
    'minecraft:dropped',
    'minecraft:picked_up',
    'minecraft:broken',
    'minecraft:placed',
  ];

  for (const sec of itemSections) {
    const o = asObj((stats as Record<string, unknown>)[sec]);
    if (!o) continue;
    for (const key of Object.keys(o)) {
      if (!translations?.items?.[key]) missing.items.add(key);
    }
  }

  const mobSections = ['minecraft:killed', 'minecraft:killed_by'];
  for (const sec of mobSections) {
    const o = asObj((stats as Record<string, unknown>)[sec]);
    if (!o) continue;
    for (const key of Object.keys(o)) {
      if (!translations?.mobs?.[key]) missing.mobs.add(key);
    }
  }

  console.group('Übersetzungsprüfung');
  console.info('Fehlende Stats:', [...missing.stats]);
  console.info('Fehlende Items:', [...missing.items]);
  console.info('Fehlende Mobs:', [...missing.mobs]);
  console.groupEnd();
}
