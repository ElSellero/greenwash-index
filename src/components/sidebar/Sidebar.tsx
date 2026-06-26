'use client';
import { useMemo, useRef, useState } from 'react';
import type { LeaderboardEntry } from '@/lib/api-types';
import { LeaderboardRow } from './LeaderboardRow';
import { AdSlot } from '@/components/ui/AdSlot';
import { useAppStore } from '@/lib/store';
import { clampSheetHeight, snapExpanded, DRAG_THRESHOLD_PX } from '@/lib/sheet';
import { allTimeScore } from '@/lib/score/hypocrisy';

const COLLAPSED_PX = 144; // matches the collapsed h-36 snap point
const expandedPx = () => Math.round(0.7 * window.innerHeight); // matches h-[70dvh]

export const Sidebar = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const favorites = useAppStore((s) => s.favorites);
  const rankMode = useAppStore((s) => s.rankMode);
  const setRankMode = useAppStore((s) => s.setRankMode);
  const [expanded, setExpanded] = useState(false); // mobile sheet snap target
  const [dragHeight, setDragHeight] = useState<number | null>(null); // live px while dragging
  const drag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);

  const onHandleDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startH: expanded ? expandedPx() : COLLAPSED_PX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = e.clientY - d.startY; // finger down = positive
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) d.moved = true;
    setDragHeight(clampSheetHeight(d.startH - delta, COLLAPSED_PX, expandedPx()));
  };
  const onHandleUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved && dragHeight != null) setExpanded(snapExpanded(dragHeight, COLLAPSED_PX, expandedPx()));
    else setExpanded((v) => !v); // a tap (no real drag) still toggles
    setDragHeight(null);
  };

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
      style={dragHeight != null ? { height: dragHeight, transition: 'none' } : undefined}
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border border-panel-edge bg-panel/90 backdrop-blur
        transition-[height] duration-300 md:inset-y-0 md:left-0 md:right-auto md:!h-full md:w-80 md:rounded-none md:border-y-0 md:border-l-0
        ${expanded ? 'h-[70dvh]' : 'h-36'}`}
    >
      <button
        className="flex w-full shrink-0 cursor-grab touch-none select-none items-center justify-center py-3 active:cursor-grabbing md:hidden"
        aria-label={expanded ? 'Collapse leaderboard' : 'Expand leaderboard'} aria-expanded={expanded}
        onPointerDown={onHandleDown} onPointerMove={onHandleMove}
        onPointerUp={onHandleUp} onPointerCancel={onHandleUp}>
        <span className="block h-1.5 w-10 rounded-full bg-panel-edge" />
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
