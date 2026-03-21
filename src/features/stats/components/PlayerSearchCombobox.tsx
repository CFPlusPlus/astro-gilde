import React, { useId } from 'react';
import { Search, X } from 'lucide-react';

import type { PlayersSearchItem } from '../types';
import { PlayerAvatar } from './PlayerAvatar';

const MIN_QUERY_LENGTH = 2;

type PlayerSearchComboboxProps = {
  value: string;
  onChange: (next: string) => void;
  items: PlayersSearchItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIndex: number;
  onSelectedIndexChange: (next: number) => void;
  onChoose: (uuid: string) => void;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
  errorMessage?: string | null;
  className?: string;
  label?: string;
  placeholder?: string;
  popupPlacement?: 'bottom' | 'top' | 'auto';
};

type PopupState = {
  hasQuery: boolean;
  hasItems: boolean;
  hasError: boolean;
  isEmpty: boolean;
  showPopup: boolean;
};

type ComboboxKeyDownContext = {
  open: boolean;
  showPopup: boolean;
  items: PlayersSearchItem[];
  selectedIndex: number;
  onOpenChange: (open: boolean) => void;
  onSelectedIndexChange: (next: number) => void;
  onChoose: (uuid: string) => void;
};

type ComboboxKeyDownHandler = (
  event: React.KeyboardEvent<HTMLInputElement>,
  ctx: ComboboxKeyDownContext,
  itemCount: number,
) => void;

function resolvePopupState({
  value,
  items,
  open,
  isLoading,
  errorMessage,
}: {
  value: string;
  items: PlayersSearchItem[];
  open: boolean;
  isLoading: boolean;
  errorMessage: string | null;
}): PopupState {
  const query = value.trim();
  const hasQuery = query.length >= MIN_QUERY_LENGTH;
  const hasItems = items.length > 0;
  const hasError = typeof errorMessage === 'string' && errorMessage.trim().length > 0;
  const isEmpty = hasQuery && !isLoading && !hasError && !hasItems;

  return {
    hasQuery,
    hasItems,
    hasError,
    isEmpty,
    showPopup: open && (hasQuery || hasItems || isLoading || hasError),
  };
}

function resolveStatusMessage({
  isLoading,
  hasError,
  isEmpty,
  hasItems,
  hasQuery,
  itemCount,
}: {
  isLoading: boolean;
  hasError: boolean;
  isEmpty: boolean;
  hasItems: boolean;
  hasQuery: boolean;
  itemCount: number;
}): string {
  if (isLoading) return 'Suche läuft.';
  if (hasError) return 'Fehler beim Laden der Spieler.';
  if (isEmpty) return 'Kein Treffer.';
  if (hasItems) return `${itemCount} Treffer verfügbar.`;
  if (hasQuery) return 'Keine Treffer verfügbar.';
  return '';
}

function resolvePopupClassName(placement: 'bottom' | 'top'): string {
  if (placement === 'top') {
    return 'mg-app-panel mg-app-panel--strong absolute right-0 left-0 bottom-[calc(100%+0.5rem)] z-[140] overflow-hidden shadow-2xl backdrop-blur-2xl backdrop-saturate-150';
  }

  return 'mg-app-panel mg-app-panel--strong absolute right-0 left-0 z-[140] mt-2 overflow-hidden shadow-2xl backdrop-blur-2xl backdrop-saturate-150';
}

function resolveAutoPopupPlacement(wrap: HTMLDivElement | null): 'bottom' | 'top' {
  if (!wrap) return 'bottom';

  const rect = wrap.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;

  if (spaceBelow < 240 && spaceAbove > spaceBelow) {
    return 'top';
  }

  return 'bottom';
}

function handleArrowDownKey(
  event: React.KeyboardEvent<HTMLInputElement>,
  ctx: ComboboxKeyDownContext,
  itemCount: number,
): void {
  const { open, selectedIndex, onOpenChange, onSelectedIndexChange } = ctx;

  event.preventDefault();
  if (!open) onOpenChange(true);
  if (itemCount <= 0) return;
  if (selectedIndex < 0) {
    onSelectedIndexChange(0);
    return;
  }

  onSelectedIndexChange((selectedIndex + 1) % itemCount);
}

function handleArrowUpKey(
  event: React.KeyboardEvent<HTMLInputElement>,
  ctx: ComboboxKeyDownContext,
  itemCount: number,
): void {
  const { open, selectedIndex, onOpenChange, onSelectedIndexChange } = ctx;

  event.preventDefault();
  if (!open) onOpenChange(true);
  if (itemCount <= 0) return;
  if (selectedIndex < 0) {
    onSelectedIndexChange(itemCount - 1);
    return;
  }

  onSelectedIndexChange((selectedIndex - 1 + itemCount) % itemCount);
}

function handleEnterKey(
  event: React.KeyboardEvent<HTMLInputElement>,
  ctx: ComboboxKeyDownContext,
  itemCount: number,
): void {
  const { showPopup, items, selectedIndex, onChoose } = ctx;
  if (!showPopup || itemCount <= 0) return;

  event.preventDefault();
  const candidate = items[selectedIndex] || items[0];
  if (!candidate?.uuid) return;
  onChoose(candidate.uuid);
}

function handleEscapeKey(
  event: React.KeyboardEvent<HTMLInputElement>,
  ctx: ComboboxKeyDownContext,
): void {
  const { open, onOpenChange, onSelectedIndexChange } = ctx;
  if (!open) return;

  event.preventDefault();
  onOpenChange(false);
  onSelectedIndexChange(-1);
}

function handleTabKey(ctx: ComboboxKeyDownContext, itemCount: number): void {
  const { open, items, selectedIndex, onChoose, onOpenChange, onSelectedIndexChange } = ctx;
  if (!open) return;

  if (selectedIndex >= 0 && selectedIndex < itemCount) {
    const candidate = items[selectedIndex];
    if (candidate?.uuid) onChoose(candidate.uuid);
  }
  onOpenChange(false);
  onSelectedIndexChange(-1);
}

const COMBOBOX_KEY_HANDLERS: Record<string, ComboboxKeyDownHandler> = {
  ArrowDown: handleArrowDownKey,
  ArrowUp: handleArrowUpKey,
  Enter: handleEnterKey,
  Escape: (event, ctx) => handleEscapeKey(event, ctx),
  Tab: (_event, ctx, itemCount) => handleTabKey(ctx, itemCount),
};

function handleComboboxKeyDown(
  event: React.KeyboardEvent<HTMLInputElement>,
  ctx: ComboboxKeyDownContext,
): void {
  const itemCount = ctx.items.length;
  const keyHandler = COMBOBOX_KEY_HANDLERS[event.key];
  if (!keyHandler) return;
  keyHandler(event, ctx, itemCount);
}

function ResultsList({
  items,
  isLoading,
  hasError,
  isEmpty,
  errorMessage,
  selectedIndex,
  listboxId,
  srLabelId,
  itemRefs,
  onChoose,
  onSelectedIndexChange,
}: {
  items: PlayersSearchItem[];
  isLoading: boolean;
  hasError: boolean;
  isEmpty: boolean;
  errorMessage: string | null;
  selectedIndex: number;
  listboxId: string;
  srLabelId: string;
  itemRefs: { current: Array<HTMLLIElement | null> };
  onChoose: (uuid: string) => void;
  onSelectedIndexChange: (next: number) => void;
}) {
  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-labelledby={srLabelId}
      className="mg-scrollbar max-h-[min(18rem,45dvh)] overflow-auto py-1"
    >
      {isLoading ? (
        <li className="text-muted px-3 py-2 text-sm" role="status" aria-live="polite">
          Suche läuft...
        </li>
      ) : null}

      {!isLoading && hasError ? (
        <li className="px-2 py-1" role="status" aria-live="polite">
          <div className="mg-notice mt-0 text-xs" data-variant="warning">
            {errorMessage}
          </div>
        </li>
      ) : null}

      {!isLoading && !hasError && isEmpty ? (
        <li className="text-muted px-3 py-2 text-sm" role="status" aria-live="polite">
          Kein Treffer. Prüfe die Schreibweise oder gib mehr Zeichen ein.
        </li>
      ) : null}

      {!isLoading &&
        !hasError &&
        items.map((item, index) => {
          const isActive = index === selectedIndex;
          const optionId = `${listboxId}-option-${index}`;
          return (
            <li
              key={`${item.uuid}-${index}`}
              id={optionId}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              role="option"
              aria-selected={isActive ? 'true' : 'false'}
              onMouseDown={(event) => {
                // Hinweis: mouseDown statt click, damit das Input-Focus-Verhalten stabil bleibt.
                event.preventDefault();
                onChoose(item.uuid);
              }}
              onMouseEnter={() => onSelectedIndexChange(index)}
              className="mg-autocomplete-option text-fg/90 flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
              data-active={isActive ? 'true' : 'false'}
            >
              <PlayerAvatar
                uuid={item.uuid}
                name={item.name}
                size={32}
                alt=""
                className="h-8 w-8 flex-none rounded-lg bg-black/20"
                loading="lazy"
                decoding="async"
              />
              <span className="min-w-0 truncate">{item.name}</span>
            </li>
          );
        })}
    </ul>
  );
}

export function PlayerSearchCombobox({
  value,
  onChange,
  items,
  open,
  onOpenChange,
  selectedIndex,
  onSelectedIndexChange,
  onChoose,
  wrapRef,
  isLoading = false,
  errorMessage = null,
  className,
  label = 'Spieler suchen',
  placeholder = 'Spieler suchen...',
  popupPlacement = 'bottom',
}: PlayerSearchComboboxProps) {
  const { hasQuery, hasItems, hasError, isEmpty, showPopup } = resolvePopupState({
    value,
    items,
    open,
    isLoading,
    errorMessage,
  });

  const inputId = useId();
  const listboxId = useId();
  const srStatusId = useId();
  const srLabelId = useId();

  const itemRefs = React.useRef<Array<HTMLLIElement | null>>([]);
  const [resolvedPopupPlacement, setResolvedPopupPlacement] = React.useState<'bottom' | 'top'>(
    popupPlacement === 'top' ? 'top' : 'bottom',
  );

  React.useEffect(() => {
    if (!showPopup || selectedIndex < 0 || selectedIndex >= items.length) return;
    const activeItem = itemRefs.current[selectedIndex];
    if (!activeItem || typeof activeItem.scrollIntoView !== 'function') return;
    activeItem.scrollIntoView({ block: 'nearest' });
  }, [items.length, selectedIndex, showPopup]);

  const activeOptionId =
    showPopup && selectedIndex >= 0 && selectedIndex < items.length
      ? `${listboxId}-option-${selectedIndex}`
      : undefined;

  React.useEffect(() => {
    if (!showPopup) return;

    if (popupPlacement === 'top') {
      setResolvedPopupPlacement('top');
      return;
    }

    if (popupPlacement === 'bottom') {
      setResolvedPopupPlacement('bottom');
      return;
    }

    const updatePlacement = () => {
      setResolvedPopupPlacement(resolveAutoPopupPlacement(wrapRef.current));
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [popupPlacement, showPopup, wrapRef]);

  const popupClassName = resolvePopupClassName(resolvedPopupPlacement);

  return (
    <div
      className={['relative z-30 w-full lg:max-w-xl', className || ''].join(' ').trim()}
      ref={wrapRef}
    >
      <label id={srLabelId} htmlFor={inputId} className="sr-only">
        {label}
      </label>

      <div className="mg-app-field flex items-center gap-2 px-3 py-2">
        <Search size={18} className="text-muted" aria-hidden="true" />
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (hasQuery || hasItems || isLoading || hasError) onOpenChange(true);
          }}
          onKeyDown={(event) =>
            handleComboboxKeyDown(event, {
              open,
              showPopup,
              items,
              selectedIndex,
              onOpenChange,
              onSelectedIndexChange,
              onChoose,
            })
          }
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showPopup ? 'true' : 'false'}
          aria-controls={showPopup ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-labelledby={srLabelId}
          aria-describedby={srStatusId}
          className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => {
            onChange('');
            onOpenChange(false);
            onSelectedIndexChange(-1);
          }}
          className={[
            'mg-search-clear',
            value.trim().length > 0 ? '' : 'mg-search-clear--hidden',
          ].join(' ')}
          aria-label="Spielersuche zurücksetzen"
          title="Suche zurücksetzen"
          tabIndex={value.trim().length > 0 ? 0 : -1}
        >
          <X size={14} />
        </button>
      </div>

      <p id={srStatusId} className="sr-only" aria-live="polite">
        {resolveStatusMessage({
          isLoading,
          hasError,
          isEmpty,
          hasItems,
          hasQuery,
          itemCount: items.length,
        })}
      </p>

      {showPopup ? (
        <div className={popupClassName}>
          <ResultsList
            items={items}
            isLoading={isLoading}
            hasError={hasError}
            isEmpty={isEmpty}
            errorMessage={errorMessage}
            selectedIndex={selectedIndex}
            listboxId={listboxId}
            srLabelId={srLabelId}
            itemRefs={itemRefs}
            onChoose={onChoose}
            onSelectedIndexChange={onSelectedIndexChange}
          />
        </div>
      ) : null}
    </div>
  );
}
