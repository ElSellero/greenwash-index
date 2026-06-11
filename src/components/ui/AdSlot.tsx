'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window { adsbygoogle?: unknown[]; googlefc?: { showRevocationMessage?: () => void } }
}

export const AdSlot = ({ slot }: { slot: string }) => {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pushed = useRef(false);
  useEffect(() => {
    if (!client || pushed.current) return;
    pushed.current = true;
    (window.adsbygoogle = window.adsbygoogle ?? []).push({});
  }, [client]);
  if (!client) return null; // pre-approval builds: no ad markup at all
  return (
    <ins
      className="adsbygoogle block min-h-24 rounded border border-panel-edge/50"
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};
