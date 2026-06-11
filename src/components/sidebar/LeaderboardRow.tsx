'use client';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/lib/api-types';
import { Co2Ticker } from '@/components/ui/Co2Ticker';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { useAppStore } from '@/lib/store';

export const LeaderboardRow = ({ entry }: { entry: LeaderboardEntry }) => {
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
        className={`flex w-full cursor-pointer items-center gap-3 border-l-2 px-3 py-2 text-left transition
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
          ${isSelected ? 'border-accent bg-panel-edge/40' : 'border-transparent hover:bg-panel-edge/20'}`}
      >
        <span className="w-7 shrink-0 font-[family-name:var(--font-mono-num)] text-xs text-dim">
          #{entry.rank}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{entry.name}</span>
          <span className="block text-[11px] text-dim">
            ×{entry.multiplier.toFixed(1)} hypocrisy ·{' '}
            <Co2Ticker baseKg={entry.co2Kg12m} ratePerSec={entry.co2RatePerSec}
              snapshotAt={entry.snapshotDate} className="text-neg" /> / yr
          </span>
        </span>
        <FavoriteButton personId={entry.personId} />
        <Link href={`/person/${entry.slug}`} onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${entry.name} profile`}
          className="text-dim transition hover:text-accent">→</Link>
      </div>
    </li>
  );
};
