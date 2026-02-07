import type { PlayerTranslations, TranslationKind } from './types';

function rawFallback(rawId: string): string {
  return rawId.replace(/^minecraft:/, '').replaceAll('_', ' ');
}

export function tLabel(
  rawId: string,
  kind: TranslationKind,
  isGerman: boolean,
  translations: PlayerTranslations | null,
): string {
  if (!isGerman) return rawFallback(rawId);

  if (kind === 'stat' && translations?.stats?.[rawId]) return translations.stats[rawId];
  if (kind === 'item' && translations?.items?.[rawId]) return translations.items[rawId];
  if (kind === 'mob' && translations?.mobs?.[rawId]) return translations.mobs[rawId];

  return rawFallback(rawId);
}

export function logMissingTranslations(
  stats: Record<string, unknown>,
  translations: PlayerTranslations | null,
) {
  if (!import.meta.env.DEV) return;
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

  for (const sectionKey of itemSections) {
    const section = asObj((stats as Record<string, unknown>)[sectionKey]);
    if (!section) continue;
    for (const key of Object.keys(section)) {
      if (!translations?.items?.[key]) missing.items.add(key);
    }
  }

  const mobSections = ['minecraft:killed', 'minecraft:killed_by'];
  for (const sectionKey of mobSections) {
    const section = asObj((stats as Record<string, unknown>)[sectionKey]);
    if (!section) continue;
    for (const key of Object.keys(section)) {
      if (!translations?.mobs?.[key]) missing.mobs.add(key);
    }
  }

  console.group('Uebersetzungspruefung');
  console.info('Fehlende Stats:', [...missing.stats]);
  console.info('Fehlende Items:', [...missing.items]);
  console.info('Fehlende Mobs:', [...missing.mobs]);
  console.groupEnd();
}
