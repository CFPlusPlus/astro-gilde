export type TableRowMotionConfig = {
  triggerKey: string;
  enabled?: boolean;
  maxRows?: number;
  stepMs?: number;
  startDelayMs?: number;
  startIndex?: number;
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
  startIndex = 0,
  className = DEFAULT_CLASS,
}: TableRowMotionConfig): TableRowMotion {
  const limit = Math.max(0, maxRows);
  const step = Math.max(0, stepMs);
  const start = Math.max(0, startDelayMs);
  const anchor = Math.max(0, Math.floor(startIndex));
  const tbodyKey = `${enabled ? 'motion' : 'static'}:${triggerKey}:${step}:${start}:${anchor}`;

  const getRowProps = (index: number) => {
    if (!enabled || index < anchor || index >= anchor + limit) return {};

    return {
      className,
    };
  };

  return { tbodyKey, getRowProps };
}

export function resolveTableMotionStartIndex(
  container: HTMLElement | null,
  maxRows?: number,
): number {
  if (typeof window === 'undefined' || !container) return 0;

  const rows = container.querySelectorAll('tbody tr');
  if (rows.length === 0) return 0;

  const nav = document.querySelector('.site-nav-shell');
  const navHeight =
    nav instanceof HTMLElement ? Math.max(0, nav.getBoundingClientRect().height) : 0;
  const viewportTop = navHeight + 2;

  let firstVisibleIndex = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const rowBottom = rows[index].getBoundingClientRect().bottom;
    if (rowBottom > viewportTop) {
      firstVisibleIndex = index;
      break;
    }
    firstVisibleIndex = rows.length - 1;
  }

  const withLeadIn = Math.max(0, firstVisibleIndex - 1);
  if (typeof maxRows !== 'number' || !Number.isFinite(maxRows) || maxRows <= 0) {
    return withLeadIn;
  }

  const clampedMaxRows = Math.max(1, Math.floor(maxRows));
  const maxStartIndex = Math.max(0, rows.length - clampedMaxRows);
  return Math.min(withLeadIn, maxStartIndex);
}
