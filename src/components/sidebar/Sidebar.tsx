'use client';
import { useMemo, useState } from 'react';
import type { LeaderboardEntry } from '@/lib/api-types';
import { LeaderboardRow } from './LeaderboardRow';
import { AdSlot } from '@/components/ui/AdSlot';
import { useAppStore } from '@/lib/store';

// all-time hypocrisy score = lifetime CO2 (tonnes) × advocacy multiplier + rhetoric floor
const allTimeScore = (e: LeaderboardEntry) => (e.co2KgTotal / 1000) * e.multiplier + e.stanceScore;

export const Sidebar = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const favorites = useAppStore((s) => s.favorites);
  const rankMode = useAppStore((s) => s.rankMode);
  const setRankMode = useAppStore((s) => s.setRankMode);
  const [expanded, setExpanded] = useState(false); // mobile sheet state

  // stable rank per mode, independent of search/favorites reordering
  const rankByMode = useMemo(() => {
    const sorted = [...entries].sort((a, b) => allTimeScore(b) - allTimeScore(a));
    const allRank = new Map<number, number>();
    sorted.forEach((e, i) => allRank.set(e.personId, i + 1));
    return allRank;
  }, [entries]);
  const rankOf = (e: LeaderboardEntry) => (rankMode === 'all' ? rankByMode.get(e.personId) ?? e.rank : e.rank);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries;
    return [...matched].sort((a, b) => {
      const favDelta = Number(favorites.includes(b.personId)) - Number(favorites.includes(a.personId));
      if (favDelta !== 0) return favDelta;
      return rankMode === 'all' ? allTimeScore(b) - allTimeScore(a) : a.rank - b.rank;
    });
  }, [entries, search, favorites, rankMode]);

  return (
    <aside
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border border-panel-edge bg-panel/90 backdrop-blur
        transition-[height] duration-300 md:inset-y-0 md:left-0 md:right-auto md:h-full md:w-80 md:rounded-none md:border-y-0 md:border-l-0
        ${expanded ? 'h-[70dvh]' : 'h-36'} md:h-full`}
    >
      <button className="cursor-pointer py-3 md:hidden" aria-label="Toggle leaderboard"
        onClick={() => setExpanded((v) => !v)}>
        <span className="mx-auto block h-1 w-10 rounded bg-panel-edge" />
      </button>
      <div className="px-4 pb-3 md:pt-5">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-dim">
          Greenwash Index
        </h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search persons of interest…"
          className="mt-3 w-full rounded border border-panel-edge bg-abyss px-3 py-2 text-sm
            placeholder:text-dim focus:border-accent focus:outline-none"
        />
        <div className="mt-3 flex rounded border border-panel-edge p-0.5 text-[11px]" role="tablist"
          aria-label="Ranking window">
          {([['12m', 'Last 12 months'], ['all', 'All-time']] as const).map(([mode, label]) => (
            <button key={mode} role="tab" aria-selected={rankMode === mode}
              onClick={() => setRankMode(mode)}
              className={`flex-1 cursor-pointer rounded px-2 py-1 transition ${
                rankMode === mode ? 'bg-accent/15 text-accent' : 'text-dim hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <nav className="mt-2 text-[10px] text-dim md:hidden">
          <a href="/methodology" className="hover:text-accent">methodology</a> ·{' '}
          <a href="/imprint" className="hover:text-accent">imprint</a> ·{' '}
          <a href="/privacy" className="hover:text-accent">privacy</a>
        </nav>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-2">
        {filtered.map((e) => <LeaderboardRow key={e.personId} entry={e} rank={rankOf(e)} mode={rankMode} />)}
        <li className="p-3"><AdSlot slot="sidebar-bottom" /></li>
      </ul>
    </aside>
  );
};
