'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { LeaderboardEntry } from '@/lib/api-types';
import { focusedVehicle, type GlobeVehicle } from '@/lib/globe/fleet';
import { describeActivity, describeLocation } from '@/lib/globe/status';
import { Co2Ticker } from './Co2Ticker';
import { SourceBadge } from './SourceBadge';
import { VehicleEmissions } from '@/components/person/VehicleEmissions';
import { useAppStore } from '@/lib/store';
import { shouldDismiss } from '@/lib/sheet';
import { allTimeScore } from '@/lib/score/hypocrisy';
import { formatCo2Kg } from '@/lib/format';

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-dim">
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const InfoPopup = ({ entries, positions }: {
  entries: LeaderboardEntry[];
  positions: GlobeVehicle[];
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
  const vehicle = focusedVehicle(positions, selectedPersonId, selectedVehicleId);

  // Fleet rows are clickable to aim the globe. Pick a representative position per
  // vehicle type for this person, preferring one that's currently en route.
  const personPositions = positions.filter((p) => p.personId === selectedPersonId);
  const pickPos = (type: 'jet' | 'yacht') =>
    personPositions.find((p) => p.type === type && p.isMoving)
    ?? personPositions.find((p) => p.type === type);
  const selectableTypes = (['jet', 'yacht'] as const).filter((t) => pickPos(t));
  // Highlight a fleet row only when its vehicle is the one explicitly selected.
  const activeType = positions.find((p) => p.vehicleId === selectedVehicleId)?.type as
    'jet' | 'yacht' | undefined;

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
        <div className="mt-1 text-xs text-dim">
          <p className="flex items-center gap-2">
            {vehicle.vehicleName}
            <SourceBadge kind={vehicle.source === 'adsb' || vehicle.source === 'ais' ? vehicle.source : 'sim'} />
          </p>
          <p className={`mt-0.5 font-num text-[10px] uppercase tracking-wider ${
            vehicle.status === 'moving' ? 'text-accent' : 'text-dim'}`}>
            {vehicle.status === 'moving' && '● '}{describeActivity(vehicle)}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-slate-400">
            <PinIcon />
            <span>{describeLocation(vehicle, new Date())}</span>
          </p>
        </div>
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
      {entry.vehicles.length > 0 && (
        <div className="mt-3 border-t border-panel-edge pt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-dim">
            Fleet · {rankMode === 'all' ? 'all-time' : '12 months'}
          </p>
          <VehicleEmissions vehicles={entry.vehicles}
            jetCo2Kg={rankMode === 'all' ? entry.jetCo2KgTotal : entry.jetCo2Kg12m}
            yachtCo2Kg={rankMode === 'all' ? entry.yachtCo2KgTotal : entry.yachtCo2Kg12m}
            selectableTypes={selectableTypes}
            activeType={activeType ?? null}
            onSelectType={(type) => { const p = pickPos(type); if (p) select(p.personId, p.vehicleId); }} />
        </div>
      )}
      <Link href={`/person/${entry.slug}`}
        className="mt-3 block rounded border border-accent/40 py-1.5 text-center text-sm text-accent transition hover:bg-accent/10">
        Full hypocrisy report →
      </Link>
    </div>
  );
};
