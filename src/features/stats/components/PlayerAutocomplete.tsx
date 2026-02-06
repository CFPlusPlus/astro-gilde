import React from 'react';
import { Search } from 'lucide-react';
import type { PlayersSearchItem } from '../types';

export function PlayerAutocomplete({
  value,
  onChange,
  items,
  open,
  onOpenChange,
  selectedIndex,
  onSelectedIndexChange,
  onChoose,
  wrapRef,
}: {
  value: string;
  onChange: (next: string) => void;
  items: PlayersSearchItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIndex: number;
  onSelectedIndexChange: (next: number) => void;
  onChoose: (uuid: string) => void;
  wrapRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative z-30 w-full lg:max-w-xl" ref={wrapRef}>
      <div className="bg-surface-solid/30 border-border flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
        <Search size={18} className="text-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => onOpenChange(items.length > 0)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              onSelectedIndexChange(Math.min((items?.length || 0) - 1, selectedIndex + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              onSelectedIndexChange(Math.max(-1, selectedIndex - 1));
            } else if (e.key === 'Enter') {
              const it = items[selectedIndex] || items[0];
              if (it?.uuid) onChoose(it.uuid);
            } else if (e.key === 'Escape') {
              onOpenChange(false);
            }
          }}
          type="search"
          autoComplete="off"
          placeholder="Spieler suchen…"
          className="placeholder:text-muted/70 text-fg w-full bg-transparent text-sm outline-none"
        />
      </div>

      {open ? (
        <div className="border-border bg-surface-solid/95 absolute right-0 left-0 z-[140] mt-2 overflow-hidden rounded-[var(--radius)] border shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
          <ul className="max-h-72 overflow-auto py-1">
            {items.map((it, idx) => {
              const isActive = idx === selectedIndex;
              return (
                <li key={`${it.uuid}-${idx}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // Hinweis: mouseDown statt click, damit das Input-Focus-Verhalten nicht stört.
                      e.preventDefault();
                      onChoose(it.uuid);
                    }}
                    onMouseEnter={() => onSelectedIndexChange(idx)}
                    className={[
                      'text-fg/90 flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      isActive ? 'bg-surface-solid/70' : 'hover:bg-surface-solid/60',
                    ].join(' ')}
                  >
                    <img
                      src={`https://minotar.net/helm/${encodeURIComponent(it.name)}/32.png`}
                      alt=""
                      className="h-8 w-8 flex-none rounded-lg bg-black/20"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="min-w-0 truncate">{it.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
