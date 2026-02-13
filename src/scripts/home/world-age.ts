const qs = <T extends Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

const diffInFullMonths = (from: Date, to: Date): number => {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  let totalMonths = years * 12 + months;
  if (to.getDate() < from.getDate()) totalMonths--;
  return Math.max(0, totalMonths);
};

const formatUnit = (n: number, singular: string, plural: string): string =>
  `${n} ${n === 1 ? singular : plural}`;

export function initHomeWorldAge(): void {
  void (async () => {
    const el = qs<HTMLElement>('#world-age');
    if (!el) return;

    const worldStart = new Date(2024, 1, 26); // 26. Feb 2024
    let now = new Date();

    try {
      const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
      const dateHeader = response.headers.get('Date');
      if (dateHeader) {
        const parsed = new Date(dateHeader);
        if (!Number.isNaN(parsed.getTime())) now = parsed;
      }
    } catch {
      // Fallback auf Client-Zeit
    }

    const totalMonths = diffInFullMonths(worldStart, now);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts: string[] = [];
    if (years > 0) parts.push(formatUnit(years, 'Jahr', 'Jahre'));
    parts.push(formatUnit(months, 'Monat', 'Monate'));
    el.textContent = parts.join(' - ');
  })();
}
