'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { LeaderboardEntry, PositionsPayload } from '@/lib/api-types';
import { Co2Ticker } from './Co2Ticker';
import { SourceBadge } from './SourceBadge';
import { useAppStore } from '@/lib/store';
import { shouldDismiss } from '@/lib/sheet';
import { allTimeScore } from '@/lib/score/hypocrisy';
import { formatCo2Kg } from '@/lib/format';

export const InfoPopup = ({ entries, positions }: {
  entries: LeaderboardEntry[];
  positions: PositionsPayload['positions'];
}) => {
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const select = useAppStore((s) => s.select);
  const rankMode = useAppStore((s) => s.rankMode);
  const [dragY, setDragY] = useState(0); // live downward-swipe offset (mobile dismiss)
  const startY = useRef<number | null>(null);
  const entry = entries.find((e) => e.personId === selectedPersonId);
  // rank must match whatever window the leaderboard is showing: stored 12m rank,
  // or the client-computed all-time rank — same ordering the sidebar list uses.
  const rank = useMemo(() => {
    if (!entry) return 0;
    if (rankMode !== 'all') return entry.rank;
    return [...entries].sort((a, b) => allTimeScore(b) - allTimeScore(a))
      .findIndex((e) => e.personId === entry.personId) + 1;
  }, [entries, rankMode, entry]);
  if (!entry) return null;
  const vehicle = positions.find((p) => p.vehicleId === selectedVehicleId)
    ?? positions.find((p) => p.personId === selectedPersonId);

  // swipe-down-to-dismiss: no pointer capture, so taps on the link/close still fire
  const onDown = (e: React.PointerEvent) => { startY.current = e.clientY; };
  const onMove = (e: React.PointerEvent) => {
    if (startY.current == null) return;
    setDragY(Math.max(0, e.clientY - startY.current)); // downward only
  };
  const onUp = () => {
    if (shouldDismiss(dragY)) select(null);
    startY.current = null;
    setDragY(0);
  };

  return (
    <div
      style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : 'transform 200ms', touchAction: 'pan-y' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      className="absolute right-4 top-14 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-panel-edge bg-panel/95 p-4 shadow-2xl backdrop-blur">
      <button onClick={() => select(null)} aria-label="Close"
        className="absolute right-3 top-2 cursor-pointer text-dim hover:text-white">✕</button>
      <p className="text-[10px] uppercase tracking-[0.2em] text-dim">
        Rank #{rank} <span className="text-panel-edge">·</span> {rankMode === 'all' ? 'all-time' : '12 months'}
      </p>
      <h2 className="text-lg font-semibold">{entry.name}</h2>
      {vehicle && (
        <p className="mt-1 flex items-center gap-2 text-xs text-dim">
          {vehicle.vehicleName}
          <SourceBadge kind={vehicle.source === 'adsb' ? 'adsb' : 'sim'} />
          {vehicle.isMoving && <span className="text-accent">● en route</span>}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase text-dim">{rankMode === 'all' ? 'CO2 / all-time' : 'CO2 / 12 months'}</dt>
          <dd>{rankMode === 'all'
            ? <span className="text-neg">{formatCo2Kg(entry.co2KgTotal)}</span>
            : <Co2Ticker baseKg={entry.co2Kg12m} ratePerSec={entry.co2RatePerSec}
                snapshotAt={entry.snapshotDate} className="text-neg" />}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-dim">Hypocrisy ×</dt>
          <dd className="font-[family-name:var(--font-mono-num)]">{entry.multiplier.toFixed(1)}</dd>
        </div>
      </dl>
      <Link href={`/person/${entry.slug}`}
        className="mt-3 block rounded border border-accent/40 py-1.5 text-center text-sm text-accent transition hover:bg-accent/10">
        Full hypocrisy report →
      </Link>
    </div>
  );
};
