'use client';
import { useEffect, useState } from 'react';
import { formatDistance, niceScale } from '@/lib/globe/scale';
import { useZoomScale } from '@/components/globe/zoomScale';

const MAX_BAR_PX = 128;
const HOLD_MS = 3000;

/** A map scale that fades in while the user zooms and fades out a few seconds after. */
export const ScaleBar = () => {
  const reading = useZoomScale();
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);

  useEffect(() => {
    if (!reading) return;
    const id = setTimeout(() => setHiddenAt(reading.at), HOLD_MS);
    return () => clearTimeout(id);
  }, [reading]);

  const visible = reading !== null && hiddenAt !== reading.at;
  const scale = reading ? niceScale(reading.kmPerPx, MAX_BAR_PX) : null;
  return (
    <div aria-hidden
      className={`pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 transition-opacity duration-300
        md:bottom-6 md:left-[calc(50%+10rem)] md:top-auto ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {scale && (
        <div className="rounded-md border border-panel-edge/70 bg-abyss/75 px-2.5 py-1.5 backdrop-blur">
          <p className="text-center font-num text-[10px] tabular-nums text-slate-200">{formatDistance(scale.km)}</p>
          <div className="mt-1 h-1.5 border-x-2 border-b-2 border-slate-300/80" style={{ width: scale.px }} />
        </div>
      )}
    </div>
  );
};
