import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { nf } from './format';
import { getPlayerStatsPanelId, getPlayerStatsTabId } from './PlayerStatsToolbar';
import {
  nextSort,
  type ItemsRow,
  type MobsRow,
  type PlayerTables,
  type SortDir,
  type SortState,
  type TabKey,
} from './table-model';
import { DataSurface, NoResults, SortIcon } from './ui';
import { createTableRowMotion, resolveTableMotionStartIndex } from '../ui/tableRowMotion';

function resolveAriaSort(
  activeKey: string,
  key: string,
  dir: SortDir,
): 'none' | 'ascending' | 'descending' {
  if (activeKey !== key || dir === 'none') return 'none';
  return dir === 'asc' ? 'ascending' : 'descending';
}

function sortDirLabel(dir: SortDir): string {
  if (dir === 'asc') return 'aufsteigend';
  if (dir === 'desc') return 'absteigend';
  return 'nicht sortiert';
}

function sortHint(currentKey: string, key: string, dir: SortDir): string {
  const currentDir = currentKey === key ? dir : 'none';
  const nextDir = currentKey === key ? nextSort(dir) : 'asc';
  return `Aktuell ${sortDirLabel(currentDir)}. Aktiviert ${sortDirLabel(nextDir)}.`;
}

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
  const tableHeadClass = 'mg-table-sticky-head text-muted text-xs';
  const tableHeadClassLg = `${tableHeadClass} lg:sticky lg:top-[calc(4rem+env(safe-area-inset-top))] lg:z-10`;
  const tableWrapClassLg =
    'mg-scrollbar max-w-full overflow-x-auto overscroll-x-contain rounded-[calc(var(--radius)-1px)] lg:overflow-x-visible';
  const itemsTableWrapClass =
    'mg-scrollbar max-w-full overflow-x-auto overscroll-x-contain rounded-[calc(var(--radius)-1px)]';
  const tableBodyClass =
    'divide-border/75 [&>tr:hover]:bg-surface-solid/35 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3 [&>tr>td]:text-left [&>tr>th]:px-4 [&>tr>th]:py-3 [&>tr>th]:text-left';
  const sortButtonClass =
    'focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none';
  const motionMaxRows = 12;
  const generalTableWrapRef = useRef<HTMLDivElement | null>(null);
  const itemsTableWrapRef = useRef<HTMLDivElement | null>(null);
  const mobsTableWrapRef = useRef<HTMLDivElement | null>(null);
  const [generalMotionStartIndex, setGeneralMotionStartIndex] = useState(0);
  const [itemsMotionStartIndex, setItemsMotionStartIndex] = useState(0);
  const [mobsMotionStartIndex, setMobsMotionStartIndex] = useState(0);

  const handleGeneralSort = (key: 'label' | 'value' | 'raw') => {
    setGeneralMotionStartIndex(
      resolveTableMotionStartIndex(generalTableWrapRef.current, motionMaxRows),
    );
    setSortGeneral((s) => ({
      key,
      dir: s.key === key ? nextSort(s.dir) : 'asc',
    }));
  };

  const handleItemsSort = (key: keyof ItemsRow) => {
    setItemsMotionStartIndex(
      resolveTableMotionStartIndex(itemsTableWrapRef.current, motionMaxRows),
    );
    setSortItems((s) => ({
      key,
      dir: s.key === key ? nextSort(s.dir) : 'asc',
    }));
  };

  const handleMobsSort = (key: keyof MobsRow) => {
    setMobsMotionStartIndex(resolveTableMotionStartIndex(mobsTableWrapRef.current, motionMaxRows));
    setSortMobs((s) => ({
      key,
      dir: s.key === key ? nextSort(s.dir) : 'asc',
    }));
  };

  const generalMotion = createTableRowMotion({
    triggerKey: `player-general-${sortGeneral.key}-${sortGeneral.dir}`,
    enabled: activeTab === 'allgemein' && filtered.general.length > 0,
    maxRows: motionMaxRows,
    stepMs: 30,
    startIndex: generalMotionStartIndex,
  });
  const itemsMotion = createTableRowMotion({
    triggerKey: `player-items-${sortItems.key}-${sortItems.dir}`,
    enabled: activeTab === 'items' && filtered.items.length > 0,
    maxRows: motionMaxRows,
    stepMs: 30,
    startIndex: itemsMotionStartIndex,
  });
  const mobsMotion = createTableRowMotion({
    triggerKey: `player-mobs-${sortMobs.key}-${sortMobs.dir}`,
    enabled: activeTab === 'mobs' && filtered.mobs.length > 0,
    maxRows: motionMaxRows,
    stepMs: 30,
    startIndex: mobsMotionStartIndex,
  });
  const renderSurfaceContent = (table: ReactNode, isEmpty: boolean) => (
    <div className="divide-border/70 flex flex-col divide-y">
      {table}
      {isEmpty ? (
        <div className="px-4 py-4">
          <NoResults className="mt-0" />
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {activeTab === 'allgemein' ? (
        <section
          role="tabpanel"
          id={getPlayerStatsPanelId('allgemein')}
          aria-labelledby={getPlayerStatsTabId('allgemein')}
        >
          <DataSurface
            header={
              <>
                <p className="text-fg text-sm font-semibold">Allgemein</p>
                <p className="text-muted text-xs">{nf(filtered.general.length)} Treffer</p>
              </>
            }
            content={renderSurfaceContent(
              <div ref={generalTableWrapRef} className={tableWrapClassLg}>
                <table className="w-full min-w-[860px] text-sm">
                  <caption className="sr-only">Tabelle mit allgemeinen Spielerstatistiken.</caption>
                  <thead className={tableHeadClassLg}>
                    <tr>
                      <th
                        id="player-general-col-label"
                        scope="col"
                        className={sortHeaderClass(isGeneralSortActive('label'))}
                        aria-sort={resolveAriaSort(sortGeneral.key, 'label', sortGeneral.dir)}
                      >
                        <button
                          type="button"
                          className={sortButtonClass}
                          onClick={() => handleGeneralSort('label')}
                          aria-label="Eintrag sortieren"
                        >
                          Eintrag
                          <SortIcon dir={sortGeneral.key === 'label' ? sortGeneral.dir : 'none'} />
                          <span className="sr-only">
                            {sortHint(sortGeneral.key, 'label', sortGeneral.dir)}
                          </span>
                        </button>
                      </th>
                      <th
                        id="player-general-col-value"
                        scope="col"
                        className={sortHeaderClass(isGeneralSortActive('value'))}
                        aria-sort={resolveAriaSort(sortGeneral.key, 'value', sortGeneral.dir)}
                      >
                        <button
                          type="button"
                          className={sortButtonClass}
                          onClick={() => handleGeneralSort('value')}
                          aria-label="Wert sortieren"
                        >
                          Wert
                          <SortIcon dir={sortGeneral.key === 'value' ? sortGeneral.dir : 'none'} />
                          <span className="sr-only">
                            {sortHint(sortGeneral.key, 'value', sortGeneral.dir)}
                          </span>
                        </button>
                      </th>
                      <th
                        id="player-general-col-raw"
                        scope="col"
                        className={sortHeaderClass(isGeneralSortActive('raw'))}
                        aria-sort={resolveAriaSort(sortGeneral.key, 'raw', sortGeneral.dir)}
                      >
                        <button
                          type="button"
                          className={sortButtonClass}
                          onClick={() => handleGeneralSort('raw')}
                          aria-label={'Technischen Schl\u00fcssel sortieren'}
                        >
                          {'Technischer Schl\u00fcssel'}
                          <SortIcon dir={sortGeneral.key === 'raw' ? sortGeneral.dir : 'none'} />
                          <span className="sr-only">
                            {sortHint(sortGeneral.key, 'raw', sortGeneral.dir)}
                          </span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody key={generalMotion.tbodyKey} className={tableBodyClass}>
                    {filtered.general.map((r, index) => {
                      const motionProps = generalMotion.getRowProps(index);
                      const rowId = `player-general-row-${index}`;
                      return (
                        <tr key={r.raw} className={motionProps.className}>
                          <th
                            id={rowId}
                            scope="row"
                            className={sortCellClass(isGeneralSortActive('label'), 'font-medium')}
                          >
                            {r.label}
                          </th>
                          <td
                            className={sortCellClass(isGeneralSortActive('value'))}
                            headers={`${rowId} player-general-col-value`}
                          >
                            {r.display}
                          </td>
                          <td
                            className={sortCellClass(
                              isGeneralSortActive('raw'),
                              'text-muted text-xs font-medium whitespace-nowrap',
                            )}
                            headers={`${rowId} player-general-col-raw`}
                          >
                            {r.raw}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>,
              filtered.general.length === 0,
            )}
            footer={
              <>
                Einige Werte werden zur besseren Lesbarkeit formatiert (z. B. Spielzeit in Stunden,{' '}
                <em>one_cm</em> in Kilometern).
              </>
            }
          />
        </section>
      ) : null}

      {activeTab === 'items' ? (
        <section
          role="tabpanel"
          id={getPlayerStatsPanelId('items')}
          aria-labelledby={getPlayerStatsTabId('items')}
        >
          <DataSurface
            header={
              <>
                <p className="text-fg text-sm font-semibold">{'Gegenst\u00e4nde'}</p>
                <p className="text-muted text-xs">{nf(filtered.items.length)} Treffer</p>
              </>
            }
            content={renderSurfaceContent(
              <div ref={itemsTableWrapRef} className={itemsTableWrapClass}>
                <table className="w-full min-w-[940px] text-sm xl:min-w-[1080px]">
                  <caption className="sr-only">Tabelle mit Gegenstandsstatistiken.</caption>
                  <thead className={tableHeadClass}>
                    <tr>
                      <th
                        id="player-items-col-label"
                        scope="col"
                        className={sortHeaderClass(isItemsSortActive('label'))}
                        aria-sort={resolveAriaSort(sortItems.key, 'label', sortItems.dir)}
                      >
                        <button
                          type="button"
                          className={sortButtonClass}
                          onClick={() => handleItemsSort('label')}
                          aria-label="Item sortieren"
                        >
                          Item
                          <SortIcon dir={sortItems.key === 'label' ? sortItems.dir : 'none'} />
                          <span className="sr-only">
                            {sortHint(sortItems.key, 'label', sortItems.dir)}
                          </span>
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
                        <th
                          key={key}
                          id={`player-items-col-${key}`}
                          scope="col"
                          className={sortHeaderClass(isItemsSortActive(key), true)}
                          aria-sort={resolveAriaSort(sortItems.key, key, sortItems.dir)}
                        >
                          <button
                            type="button"
                            className={sortButtonClass}
                            onClick={() => handleItemsSort(key)}
                            aria-label={`${label} sortieren`}
                          >
                            {label}
                            <SortIcon dir={sortItems.key === key ? sortItems.dir : 'none'} />
                            <span className="sr-only">
                              {sortHint(sortItems.key, key, sortItems.dir)}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody key={itemsMotion.tbodyKey} className={tableBodyClass}>
                    {filtered.items.map((r, index) => {
                      const motionProps = itemsMotion.getRowProps(index);
                      const rowId = `player-items-row-${index}`;
                      return (
                        <tr key={r.key} className={motionProps.className}>
                          <th
                            id={rowId}
                            scope="row"
                            className={sortCellClass(isItemsSortActive('label'), 'font-medium')}
                          >
                            {r.label}
                          </th>
                          <td
                            className={sortCellClass(isItemsSortActive('mined'))}
                            headers={`${rowId} player-items-col-mined`}
                          >
                            {nf(r.mined)}
                          </td>
                          <td
                            className={sortCellClass(isItemsSortActive('broken'))}
                            headers={`${rowId} player-items-col-broken`}
                          >
                            {nf(r.broken)}
                          </td>
                          <td
                            className={sortCellClass(isItemsSortActive('crafted'))}
                            headers={`${rowId} player-items-col-crafted`}
                          >
                            {nf(r.crafted)}
                          </td>
                          <td
                            className={sortCellClass(isItemsSortActive('used'))}
                            headers={`${rowId} player-items-col-used`}
                          >
                            {nf(r.used)}
                          </td>
                          <td
                            className={sortCellClass(isItemsSortActive('picked_up'))}
                            headers={`${rowId} player-items-col-picked_up`}
                          >
                            {nf(r.picked_up)}
                          </td>
                          <td
                            className={sortCellClass(isItemsSortActive('dropped'))}
                            headers={`${rowId} player-items-col-dropped`}
                          >
                            {nf(r.dropped)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>,
              filtered.items.length === 0,
            )}
          />
        </section>
      ) : null}

      {activeTab === 'mobs' ? (
        <section
          role="tabpanel"
          id={getPlayerStatsPanelId('mobs')}
          aria-labelledby={getPlayerStatsTabId('mobs')}
        >
          <DataSurface
            header={
              <>
                <p className="text-fg text-sm font-semibold">Kreaturen</p>
                <p className="text-muted text-xs">{nf(filtered.mobs.length)} Treffer</p>
              </>
            }
            content={renderSurfaceContent(
              <div ref={mobsTableWrapRef} className={tableWrapClassLg}>
                <table className="w-full min-w-[760px] text-sm">
                  <caption className="sr-only">Tabelle mit Kreaturenstatistiken.</caption>
                  <thead className={tableHeadClassLg}>
                    <tr>
                      <th
                        id="player-mobs-col-label"
                        scope="col"
                        className={sortHeaderClass(isMobsSortActive('label'))}
                        aria-sort={resolveAriaSort(sortMobs.key, 'label', sortMobs.dir)}
                      >
                        <button
                          type="button"
                          className={sortButtonClass}
                          onClick={() => handleMobsSort('label')}
                          aria-label="Kreatur sortieren"
                        >
                          Kreatur
                          <SortIcon dir={sortMobs.key === 'label' ? sortMobs.dir : 'none'} />
                          <span className="sr-only">
                            {sortHint(sortMobs.key, 'label', sortMobs.dir)}
                          </span>
                        </button>
                      </th>
                      {(
                        [
                          ['killed', 'Get\u00f6tet'],
                          ['killed_by', 'Gestorben durch'],
                        ] as const
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          id={`player-mobs-col-${key}`}
                          scope="col"
                          className={sortHeaderClass(isMobsSortActive(key), true)}
                          aria-sort={resolveAriaSort(sortMobs.key, key, sortMobs.dir)}
                        >
                          <button
                            type="button"
                            className={sortButtonClass}
                            onClick={() => handleMobsSort(key)}
                            aria-label={`${label} sortieren`}
                          >
                            {label}
                            <SortIcon dir={sortMobs.key === key ? sortMobs.dir : 'none'} />
                            <span className="sr-only">
                              {sortHint(sortMobs.key, key, sortMobs.dir)}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody key={mobsMotion.tbodyKey} className={tableBodyClass}>
                    {filtered.mobs.map((r, index) => {
                      const motionProps = mobsMotion.getRowProps(index);
                      const rowId = `player-mobs-row-${index}`;
                      return (
                        <tr key={r.key} className={motionProps.className}>
                          <th
                            id={rowId}
                            scope="row"
                            className={sortCellClass(isMobsSortActive('label'), 'font-medium')}
                          >
                            {r.label}
                          </th>
                          <td
                            className={sortCellClass(isMobsSortActive('killed'))}
                            headers={`${rowId} player-mobs-col-killed`}
                          >
                            {nf(r.killed)}
                          </td>
                          <td
                            className={sortCellClass(isMobsSortActive('killed_by'))}
                            headers={`${rowId} player-mobs-col-killed_by`}
                          >
                            {nf(r.killed_by)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>,
              filtered.mobs.length === 0,
            )}
          />
        </section>
      ) : null}
    </>
  );
}
