export type TableRowMotionConfig = {
  triggerKey: string;
  enabled?: boolean;
  maxRows?: number;
  stepMs?: number;
  startDelayMs?: number;
  className?: string;
};

export type TableRowMotion = {
  tbodyKey: string;
  getRowProps: (index: number) => { className?: string };
};

const DEFAULT_CLASS = 'mg-table-row-enter';

export function createTableRowMotion({
  triggerKey,
  enabled = true,
  maxRows = 12,
  stepMs = 26,
  startDelayMs = 0,
  className = DEFAULT_CLASS,
}: TableRowMotionConfig): TableRowMotion {
  const limit = Math.max(0, maxRows);
  const step = Math.max(0, stepMs);
  const start = Math.max(0, startDelayMs);
  const tbodyKey = `${enabled ? 'motion' : 'static'}:${triggerKey}:${step}:${start}`;

  const getRowProps = (index: number) => {
    if (!enabled || index < 0 || index >= limit) return {};

    return {
      className,
    };
  };

  return { tbodyKey, getRowProps };
}
