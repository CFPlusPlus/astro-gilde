export const HOUR_METRIC_KEYS: ReadonlySet<string> = new Set([
  'minecraft:play_time',
  'minecraft:sneak_time',
  'minecraft:time_since_death',
  'minecraft:time_since_rest',
  'minecraft:total_world_time',
]);

export const TICKS_PER_HOUR = 72_000;
export const CM_PER_KM = 100_000;

export function isDistanceMetricInCentimeters(metricId: string): boolean {
  return metricId.endsWith('_one_cm');
}

export function transformRawMinecraftValue(
  metricId: string,
  rawValue: number,
): { value: number; unit?: string; decimals?: number } {
  if (HOUR_METRIC_KEYS.has(metricId)) {
    return { value: rawValue / TICKS_PER_HOUR, unit: 'h', decimals: 2 };
  }

  if (isDistanceMetricInCentimeters(metricId)) {
    return { value: rawValue / CM_PER_KM, unit: 'km', decimals: 2 };
  }

  return { value: rawValue };
}
