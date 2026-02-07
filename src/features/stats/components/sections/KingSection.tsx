import { Crown } from 'lucide-react';

import type { LeaderboardState } from '../../types-ui';
import { LeaderboardTable } from '../LeaderboardTable';
import { SectionTitle } from '../StatsPrimitives';

export function KingSection({
  king,
  pageSize,
  getPlayerName,
  onPlayerClick,
  onGoPage,
  onLoadMore,
}: {
  king: LeaderboardState;
  pageSize: number;
  getPlayerName: (uuid: string) => string;
  onPlayerClick: (uuid: string) => void;
  onGoPage: (pageIndex: number) => void;
  onLoadMore: () => void;
}) {
  return (
    <section aria-label="Server-K&ouml;nig" className="mg-container pb-12">
      <div className="mt-6">
        <SectionTitle
          title="Server-K&ouml;nig"
          subtitle="Wer sammelt die meisten Punkte &uuml;ber alle Kategorien hinweg?"
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="mg-callout flex items-start gap-3" data-variant="info">
              <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
                <Crown size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-fg font-semibold">Wie werden die Punkte berechnet?</p>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  F&uuml;r jede Kategorie bekommen die Top 3 Spieler Punkte (3 / 2 / 1). Ab Platz 4
                  gibt es keine Punkte. Die Punkte werden &uuml;ber alle Kategorien addiert.
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <LeaderboardTable
              def={{ label: 'Punkte', category: 'King' }}
              state={king}
              pageSize={pageSize}
              getPlayerName={getPlayerName}
              onPlayerClick={onPlayerClick}
              onGoPage={onGoPage}
              onLoadMore={onLoadMore}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
