import { X } from 'lucide-react';
import { useEffect, useId, useRef, type RefObject } from 'react';

import { PlayerAutocomplete } from '../../components/PlayerAutocomplete';
import type { PlayersSearchItem } from '../../types';
import { trapFocusInContainer } from '../../../../scripts/app/dialog';
import { lockPageScroll, unlockPageScroll } from '../../../../scripts/app/scroll-lock';

const SEARCH_SHEET_SCROLL_LOCK_ID = 'stats-search-sheet';

type AutocompleteViewModel = {
  value: string;
  setValue: (next: string) => void;
  items: PlayersSearchItem[];
  open: boolean;
  setOpen: (next: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (next: number) => void;
  wrapRef: RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  errorMessage: string | null;
};

export function SearchSheet({
  open,
  sheetId,
  search,
  onClose,
  onChoosePlayer,
}: {
  open: boolean;
  sheetId: string;
  search: AutocompleteViewModel;
  onClose: () => void;
  onChoosePlayer: (uuid: string) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockPageScroll(SEARCH_SHEET_SCROLL_LOCK_ID);

    const focusInput = () => {
      const input =
        search.wrapRef.current?.querySelector<HTMLInputElement>('input[role="combobox"]');
      if (!input) return;
      input.focus();
      const inputLength = input.value.length;
      input.setSelectionRange(inputLength, inputLength);
    };

    const focusRaf = window.requestAnimationFrame(focusInput);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      trapFocusInContainer(event, dialogRef.current);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusRaf);
      window.removeEventListener('keydown', onKeyDown);
      unlockPageScroll(SEARCH_SHEET_SCROLL_LOCK_ID);

      const lastFocusedElement = lastFocusedElementRef.current;
      if (lastFocusedElement && document.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
      }
    };
  }, [onClose, open, search.wrapRef]);

  if (!open) return null;

  return (
    <div
      id={sheetId}
      className="fixed inset-0 z-[180] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={'Spielersuche schlie\u00dfen'}
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        tabIndex={-1}
        className="bg-surface-solid/96 border-border absolute inset-x-0 bottom-0 flex h-[70dvh] max-h-[70dvh] min-h-[18rem] flex-col overflow-hidden rounded-t-[1rem] border-t shadow-2xl sm:h-[64dvh] sm:max-h-[64dvh]"
      >
        <header className="border-border/80 flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p id={titleId} className="text-fg text-sm font-semibold">
              Spieler suchen
            </p>
            <p id={descriptionId} className="text-muted text-xs">
              {'Namen eingeben und Treffer ausw\u00e4hlen.'}
            </p>
          </div>
          <button
            type="button"
            className="focus-visible:ring-offset-bg text-fg hover:text-accent inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label={'Spielersuche schlie\u00dfen'}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="mg-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
          <PlayerAutocomplete
            value={search.value}
            onChange={search.setValue}
            items={search.items}
            open={search.open}
            onOpenChange={search.setOpen}
            selectedIndex={search.selectedIndex}
            onSelectedIndexChange={search.setSelectedIndex}
            onChoose={onChoosePlayer}
            wrapRef={search.wrapRef}
            isLoading={search.isLoading}
            errorMessage={search.errorMessage}
            className="w-full lg:max-w-none"
            popupPlacement="bottom"
          />
        </div>
      </section>
    </div>
  );
}
