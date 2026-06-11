'use client';
import { useMemo, useState } from 'react';
import type { LeaderboardEntry } from '@/lib/api-types';
import { LeaderboardRow } from './LeaderboardRow';
import { useAppStore } from '@/lib/store';

export const Sidebar = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const favorites = useAppStore((s) => s.favorites);
  const [expanded, setExpanded] = useState(false); // mobile sheet state

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries;
    return [...matched].sort((a, b) => {
      const favDelta = Number(favorites.includes(b.personId)) - Number(favorites.includes(a.personId));
      return favDelta !== 0 ? favDelta : a.rank - b.rank;
    });
  }, [entries, search, favorites]);

  return (
    <aside
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border border-panel-edge bg-panel/90 backdrop-blur
        transition-[height] duration-300 md:inset-y-0 md:left-0 md:right-auto md:h-full md:w-80 md:rounded-none md:border-y-0 md:border-l-0
        ${expanded ? 'h-[70dvh]' : 'h-36'} md:h-full`}
    >
      <button className="cursor-pointer py-2 md:hidden" aria-label="Toggle leaderboard"
        onClick={() => setExpanded((v) => !v)}>
        <span className="mx-auto block h-1 w-10 rounded bg-panel-edge" />
      </button>
      <div className="px-3 pb-2">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-dim">
          Greenwash Index
        </h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search persons of interest…"
          className="mt-2 w-full rounded border border-panel-edge bg-abyss px-2 py-1.5 text-sm
            placeholder:text-dim focus:border-accent focus:outline-none"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((e) => <LeaderboardRow key={e.personId} entry={e} />)}
      </ul>
    </aside>
  );
};
