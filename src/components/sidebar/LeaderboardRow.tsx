'use client';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/lib/api-types';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { useAppStore } from '@/lib/store';
import { ScoreInvoice } from './ScoreInvoice';

export const LeaderboardRow = (
  { entry, rank, mode }: { entry: LeaderboardEntry; rank: number; mode: '12m' | 'all' },
) => {
  const select = useAppStore((s) => s.select);
  const isSelected = useAppStore((s) => s.selectedPersonId === entry.personId);
  return (
    <li>
      {/* div, not button: row contains nested interactive elements (favorite, profile link) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => select(entry.personId)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(entry.personId); }
        }}
        className={`flex min-h-11 w-full cursor-pointer items-start gap-3 border-l-2 px-4 py-2.5 text-left transition
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
          ${isSelected ? 'border-accent bg-panel-edge/40' : 'border-transparent hover:bg-panel-edge/20'}`}
      >
        <span className="w-7 shrink-0 pt-0.5 font-[family-name:var(--font-mono-num)] text-xs text-dim">
          #{rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.name}</p>
          <ScoreInvoice entry={entry} mode={mode} />
        </div>
        <span className="flex shrink-0 items-center gap-3">
          <FavoriteButton personId={entry.personId} />
          <Link href={`/person/${entry.slug}`} onClick={(e) => e.stopPropagation()}
            aria-label={`Open ${entry.name} profile`}
            className="text-dim transition hover:text-accent">→</Link>
        </span>
      </div>
    </li>
  );
};
