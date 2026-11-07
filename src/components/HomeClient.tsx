'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import type { LeaderboardPayload, PositionsPayload } from '@/lib/api-types';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { InfoPopup } from '@/components/ui/InfoPopup';
import { LiveFeed } from '@/components/ui/LiveFeed';
import { GlobeLegend } from '@/components/ui/GlobeLegend';
import { ScaleBar } from '@/components/ui/ScaleBar';
import { resolveFleet } from '@/lib/globe/fleet';
import { CONFIG } from '@/config';

const FLEET_REFRESH_MS = 30_000;

const GlobeCanvas = dynamic(
  () => import('@/components/globe/GlobeCanvas').then((m) => m.GlobeCanvas),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-dim">Spinning up the globe…</div> },
);

export const HomeClient = ({ initial }: { initial: { board: LeaderboardPayload; positions: PositionsPayload } }) => {
  const [board, setBoard] = useState(initial.board);
  const [positions, setPositions] = useState(initial.positions);
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/positions');
        if (res.ok) setPositions(await res.json());
      } catch { /* keep last state */ }
    }, CONFIG.cache.positionsSMaxAge * 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const res = await fetch('/api/leaderboard', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (res.ok && active) setBoard(await res.json());
      } catch { /* retain the last successful result; try again next interval */ }
      finally { pending = false; }
    };
    void refresh();
    const id = setInterval(refresh, CONFIG.cache.leaderboardSMaxAge * 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), FLEET_REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const vehicles = useMemo(() => resolveFleet(positions, now), [positions, now]);
  const names = useMemo(
    () => new Map(board.leaderboard.map((e) => [e.personId, e.name])),
    [board.leaderboard],
  );

  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0 md:left-80">
        <GlobeCanvas vehicles={vehicles} names={names} />
      </div>
      <GlobeLegend />
      <ScaleBar />
      <Sidebar entries={board.leaderboard} />
      <InfoPopup entries={board.leaderboard} positions={vehicles} />
      <LiveFeed events={board.recentEvents} />
    </main>
  );
};
