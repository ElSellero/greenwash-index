'use client';
import Link from 'next/link';
import type { LeaderboardEntry, PositionsPayload } from '@/lib/api-types';
import { Co2Ticker } from './Co2Ticker';
import { SourceBadge } from './SourceBadge';
import { useAppStore } from '@/lib/store';

export const InfoPopup = ({ entries, positions }: {
  entries: LeaderboardEntry[];
  positions: PositionsPayload['positions'];
}) => {
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const select = useAppStore((s) => s.select);
  const entry = entries.find((e) => e.personId === selectedPersonId);
  if (!entry) return null;
  const vehicle = positions.find((p) => p.vehicleId === selectedVehicleId)
    ?? positions.find((p) => p.personId === selectedPersonId);

  return (
    <div className="absolute right-4 top-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-panel-edge bg-panel/95 p-4 shadow-2xl backdrop-blur">
      <button onClick={() => select(null)} aria-label="Close"
        className="absolute right-3 top-2 cursor-pointer text-dim hover:text-white">✕</button>
      <p className="text-[10px] uppercase tracking-[0.2em] text-dim">Rank #{entry.rank}</p>
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
          <dt className="text-[10px] uppercase text-dim">CO2 / 12 months</dt>
          <dd><Co2Ticker baseKg={entry.co2Kg12m} ratePerSec={entry.co2RatePerSec}
            snapshotAt={entry.snapshotDate} className="text-neg" /></dd>
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
