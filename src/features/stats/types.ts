export type MetricId = string;

export interface MetricDef {
  label: string;
  category: string;
  unit?: string;
  sort_order?: number;
  divisor?: number;
  decimals?: number;
}

export interface MetricsResponse {
  metrics?: Record<MetricId, MetricDef>;
  __generated?: string;
}

export interface SummaryResponse {
  player_count?: number;
  totals?: Record<MetricId, number>;
  __generated?: string;
}

export interface LeaderboardRow {
  uuid: string;
  value: number;
}

export interface LeaderboardResponse {
  boards?: Record<MetricId, LeaderboardRow[]>;
  cursors?: Record<MetricId, string | null>;
  __players?: Record<string, string>; // uuid -> name
  __generated?: string;
}

export interface PlayersSearchItem {
  uuid: string;
  name: string;
}

export interface PlayersSearchResponse {
  items?: PlayersSearchItem[];
  __generated?: string;
}
