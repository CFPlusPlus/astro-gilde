import { describe, expect, it } from 'vitest';
import { resolvePageControls } from './Pagination';

describe('resolvePageControls', () => {
  it('liefert alle Seiten bei kleinen Listen', () => {
    expect(resolvePageControls(0, 0)).toEqual([]);
    expect(resolvePageControls(4, 1)).toEqual([0, 1, 2, 3]);
  });

  it('komprimiert mittlere Bereiche mit Ellipsen', () => {
    expect(resolvePageControls(20, 10)).toEqual([
      0,
      'ellipsis-left',
      8,
      9,
      10,
      11,
      12,
      'ellipsis-right',
      19,
    ]);
  });

  it('zeigt am Anfang und Ende ein sinnvolles Fenster', () => {
    expect(resolvePageControls(20, 1)).toEqual([0, 1, 2, 3, 4, 5, 'ellipsis-right', 19]);
    expect(resolvePageControls(20, 18)).toEqual([0, 'ellipsis-left', 14, 15, 16, 17, 18, 19]);
  });
});
