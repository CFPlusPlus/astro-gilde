export interface PlayerApiResponse {
  __generated?: string;
  uuid?: string;
  name?: string;
  found?: boolean;
  player?: Record<string, unknown>;
}

export interface PlayerTranslations {
  stats?: Record<string, string>;
  items?: Record<string, string>;
  mobs?: Record<string, string>;
  words?: Record<string, string>;
}

export type TranslationKind = 'stat' | 'item' | 'mob';
