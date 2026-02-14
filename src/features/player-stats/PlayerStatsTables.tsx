import type { Dispatch, SetStateAction } from 'react';

import { nf } from './format';
import {
  nextSort,
  type ItemsRow,
  type MobsRow,
  type PlayerTables,
  type SortState,
  type TabKey,
} from './table-model';
import { NoResults, SortIcon } from './ui';
import { createTableRowMotion } from '../ui/tableRowMotion';

export function PlayerStatsTables({
  activeTab,
  filtered,
  sortGeneral,
  setSortGeneral,
  sortItems,
  setSortItems,
  sortMobs,
  setSortMobs,
}: {
  activeTab: TabKey;
  filtered: PlayerTables;
  sortGeneral: SortState<'label' | 'value' | 'raw'>;
  setSortGeneral: Dispatch<SetStateAction<SortState<'label' | 'value' | 'raw'>>>;
  sortItems: SortState<keyof ItemsRow>;
  setSortItems: Dispatch<SetStateAction<SortState<keyof ItemsRow>>>;
  sortMobs: SortState<keyof MobsRow>;
  setSortMobs: Dispatch<SetStateAction<SortState<keyof MobsRow>>>;
}) {
  const isGeneralSortActive = (key: string) =>
    sortGeneral.key === key && sortGeneral.dir !== 'none';
  const isItemsSortActive = (key: string) => sortItems.key === key && sortItems.dir !== 'none';
  const isMobsSortActive = (key: string) => sortMobs.key === key && sortMobs.dir !== 'none';
  const sortHeaderClass = (isActive: boolean, nowrap = false) =>
    [
      'px-4 py-3 text-left font-semibold',
      nowrap ? 'whitespace-nowrap' : '',
      isActive ? 'bg-accent/10 text-fg' : '',
    ].join(' ');
  const sortCellClass = (isActive: boolean, baseClass = '') =>
    [baseClass, isActive ? 'bg-accent/[0.06] text-fg font-medium' : ''].join(' ').trim();
  const generalMotion = createTableRowMotion({
    triggerKey: `player-general-${sortGeneral.key}-${sortGeneral.dir}`,
    enabled: activeTab === 'allgemein' && filtered.general.length > 0,
    maxRows: 12,
    stepMs: 30,
  });
  const itemsMotion = createTableRowMotion({
    triggerKey: `player-items-${sortItems.key}-${sortItems.dir}`,
    enabled: activeTab === 'items' && filtered.items.length > 0,
    maxRows: 12,
    stepMs: 30,
  });
  const mobsMotion = createTableRowMotion({
    triggerKey: `player-mobs-${sortMobs.key}-${sortMobs.dir}`,
    enabled: activeTab === 'mobs' && filtered.mobs.length > 0,
    maxRows: 12,
    stepMs: 30,
  });

  return (
    <>
      {activeTab === 'allgemein' ? (
        <section className="border-border/70 overflow-hidden rounded-[var(--radius)] border">
          <div className="border-border/70 flex items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-fg text-sm font-semibold">Allgemein</p>
            <p className="text-muted text-xs">{nf(filtered.general.length)} Einträge</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface-solid/85 text-muted sticky top-0 z-10 text-xs backdrop-blur-md">
                <tr>
                  <th className={sortHeaderClass(isGeneralSortActive('label'))}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2"
                      onClick={() =>
                        setSortGeneral((s) => ({
                          key: 'label',
                          dir: s.key === 'label' ? nextSort(s.dir) : 'asc',
                        }))
                      }
                    >
                      Eintrag{' '}
                      <SortIcon dir={sortGeneral.key === 'label' ? sortGeneral.dir : 'none'} />
                    </button>
                  </th>
                  <th className={sortHeaderClass(isGeneralSortActive('value'))}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2"
                      onClick={() =>
                        setSortGeneral((s) => ({
                          key: 'value',
                          dir: s.key === 'value' ? nextSort(s.dir) : 'asc',
                        }))
                      }
                    >
                      Wert <SortIcon dir={sortGeneral.key === 'value' ? sortGeneral.dir : 'none'} />
                    </button>
                  </th>
                  <th className={sortHeaderClass(isGeneralSortActive('raw'))}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2"
                      onClick={() =>
                        setSortGeneral((s) => ({
                          key: 'raw',
                          dir: s.key === 'raw' ? nextSort(s.dir) : 'asc',
                        }))
                      }
                    >
                      Technischer Schlüssel{' '}
                      <SortIcon dir={sortGeneral.key === 'raw' ? sortGeneral.dir : 'none'} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody
                key={generalMotion.tbodyKey}
                className="divide-border/75 [&>tr:hover]:bg-surface-solid/35 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3"
              >
                {filtered.general.map((r, index) => {
                  const motionProps = generalMotion.getRowProps(index);
                  return (
                    <tr key={r.raw} className={motionProps.className} style={motionProps.style}>
                      <td className={sortCellClass(isGeneralSortActive('label'))}>{r.label}</td>
                      <td className={sortCellClass(isGeneralSortActive('value'))}>{r.display}</td>
                      <td
                        className={sortCellClass(
                          isGeneralSortActive('raw'),
                          'text-muted text-xs font-medium whitespace-nowrap',
                        )}
                      >
                        {r.raw}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.general.length === 0 ? (
            <div className="px-4 pb-4">
              <NoResults />
            </div>
          ) : null}

          <div className="border-border/70 text-muted border-t px-4 py-3 text-sm">
            Einige Werte werden zur besseren Lesbarkeit formatiert (z. B. Spielzeit in Stunden,{' '}
            <em>one_cm</em> in Kilometern).
          </div>
        </section>
      ) : null}

      {activeTab === 'items' ? (
        <section className="border-border/70 overflow-hidden rounded-[var(--radius)] border">
          <div className="border-border/70 flex items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-fg text-sm font-semibold">Gegenstände</p>
            <p className="text-muted text-xs">{nf(filtered.items.length)} Einträge</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-surface-solid/85 text-muted sticky top-0 z-10 text-xs backdrop-blur-md">
                <tr>
                  <th className={sortHeaderClass(isItemsSortActive('label'))}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2"
                      onClick={() =>
                        setSortItems((s) => ({
                          key: 'label',
                          dir: s.key === 'label' ? nextSort(s.dir) : 'asc',
                        }))
                      }
                    >
                      Item <SortIcon dir={sortItems.key === 'label' ? sortItems.dir : 'none'} />
                    </button>
                  </th>
                  {(
                    [
                      ['mined', 'Abgebaut'],
                      ['broken', 'Verbraucht'],
                      ['crafted', 'Hergestellt'],
                      ['used', 'Benutzt'],
                      ['picked_up', 'Aufgesammelt'],
                      ['dropped', 'Fallen gelassen'],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} className={sortHeaderClass(isItemsSortActive(key), true)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2"
                        onClick={() =>
                          setSortItems((s) => ({
                            key,
                            dir: s.key === key ? nextSort(s.dir) : 'asc',
                          }))
                        }
                      >
                        {label} <SortIcon dir={sortItems.key === key ? sortItems.dir : 'none'} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                key={itemsMotion.tbodyKey}
                className="divide-border/75 [&>tr:hover]:bg-surface-solid/35 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3"
              >
                {filtered.items.map((r, index) => {
                  const motionProps = itemsMotion.getRowProps(index);
                  return (
                    <tr key={r.key} className={motionProps.className} style={motionProps.style}>
                      <td className={sortCellClass(isItemsSortActive('label'))}>{r.label}</td>
                      <td className={sortCellClass(isItemsSortActive('mined'))}>{nf(r.mined)}</td>
                      <td className={sortCellClass(isItemsSortActive('broken'))}>{nf(r.broken)}</td>
                      <td className={sortCellClass(isItemsSortActive('crafted'))}>
                        {nf(r.crafted)}
                      </td>
                      <td className={sortCellClass(isItemsSortActive('used'))}>{nf(r.used)}</td>
                      <td className={sortCellClass(isItemsSortActive('picked_up'))}>
                        {nf(r.picked_up)}
                      </td>
                      <td className={sortCellClass(isItemsSortActive('dropped'))}>
                        {nf(r.dropped)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.items.length === 0 ? (
            <div className="px-4 pb-4">
              <NoResults />
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'mobs' ? (
        <section className="border-border/70 overflow-hidden rounded-[var(--radius)] border">
          <div className="border-border/70 flex items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-fg text-sm font-semibold">Kreaturen</p>
            <p className="text-muted text-xs">{nf(filtered.mobs.length)} Einträge</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-surface-solid/85 text-muted sticky top-0 z-10 text-xs backdrop-blur-md">
                <tr>
                  <th className={sortHeaderClass(isMobsSortActive('label'))}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2"
                      onClick={() =>
                        setSortMobs((s) => ({
                          key: 'label',
                          dir: s.key === 'label' ? nextSort(s.dir) : 'asc',
                        }))
                      }
                    >
                      Kreatur <SortIcon dir={sortMobs.key === 'label' ? sortMobs.dir : 'none'} />
                    </button>
                  </th>
                  {(
                    [
                      ['killed', 'Getötet'],
                      ['killed_by', 'Gestorben durch'],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} className={sortHeaderClass(isMobsSortActive(key), true)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2"
                        onClick={() =>
                          setSortMobs((s) => ({
                            key,
                            dir: s.key === key ? nextSort(s.dir) : 'asc',
                          }))
                        }
                      >
                        {label} <SortIcon dir={sortMobs.key === key ? sortMobs.dir : 'none'} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                key={mobsMotion.tbodyKey}
                className="divide-border/75 [&>tr:hover]:bg-surface-solid/35 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3"
              >
                {filtered.mobs.map((r, index) => {
                  const motionProps = mobsMotion.getRowProps(index);
                  return (
                    <tr key={r.key} className={motionProps.className} style={motionProps.style}>
                      <td className={sortCellClass(isMobsSortActive('label'))}>{r.label}</td>
                      <td className={sortCellClass(isMobsSortActive('killed'))}>{nf(r.killed)}</td>
                      <td className={sortCellClass(isMobsSortActive('killed_by'))}>
                        {nf(r.killed_by)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.mobs.length === 0 ? (
            <div className="px-4 pb-4">
              <NoResults />
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
