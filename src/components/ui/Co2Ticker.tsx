'use client';
import { useEffect, useRef, useState } from 'react';
import { formatCo2Kg } from '@/lib/format';

type Props = {
  baseKg: number;          // co2Kg12m or co2KgTotal at snapshot time
  ratePerSec: number;      // co2RatePerSec from snapshot
  snapshotAt: string;      // ISO date of snapshot
  className?: string;
};

export const Co2Ticker = ({ baseKg, ratePerSec, snapshotAt, className }: Props) => {
  const [display, setDisplay] = useState(baseKg);
  const raf = useRef(0);

  useEffect(() => {
    const t0 = new Date(snapshotAt).getTime();
    const tick = () => {
      const elapsedSec = (Date.now() - t0) / 1000;
      setDisplay(baseKg + Math.max(0, elapsedSec) * ratePerSec);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [baseKg, ratePerSec, snapshotAt]);

  return (
    <span className={`font-[family-name:var(--font-mono-num)] tabular-nums ${className ?? ''}`}
      title="Estimated — interpolated from the last data refresh">
      {formatCo2Kg(display)}
    </span>
  );
};
