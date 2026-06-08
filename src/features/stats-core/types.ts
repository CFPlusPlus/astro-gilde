export interface PlayerApiResponse {
  __generated?: string;
  __generated_timezone?: string | null;
  uuid?: string;
  name?: string;
  found?: boolean;
  player?: Record<string, unknown> | null;
}

export interface PlayerTranslations {
  stats?: Record<string, string>;
  items?: Record<string, string>;
  mobs?: Record<string, string>;
  words?: Record<string, string>;
}

export type TranslationKind = 'stat' | 'item' | 'mob';
