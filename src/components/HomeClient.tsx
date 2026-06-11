'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { LeaderboardPayload, PositionsPayload } from '@/lib/api-types';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { InfoPopup } from '@/components/ui/InfoPopup';
import { LiveFeed } from '@/components/ui/LiveFeed';
import { CONFIG } from '@/config';

const GlobeCanvas = dynamic(
  () => import('@/components/globe/GlobeCanvas').then((m) => m.GlobeCanvas),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-dim">Spinning up the globe…</div> },
);

export const HomeClient = ({ initial }: { initial: { board: LeaderboardPayload; positions: PositionsPayload } }) => {
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

  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0 md:left-80">
        <GlobeCanvas data={positions} />
      </div>
      <Sidebar entries={initial.board.leaderboard} />
      <InfoPopup entries={initial.board.leaderboard} positions={positions.positions} />
      <LiveFeed events={initial.board.recentEvents} />
    </main>
  );
};
