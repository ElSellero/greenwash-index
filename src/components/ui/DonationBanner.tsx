'use client';
import { useSyncExternalStore } from 'react';

const KOFI = process.env.NEXT_PUBLIC_DONATE_KOFI;
const GITHUB = process.env.NEXT_PUBLIC_DONATE_GITHUB;
const DISMISS_KEY = 'greenwash-index-banner';
const DISMISS_EVENT = 'gwx-banner-dismiss';

const subscribe = (cb: () => void) => {
  window.addEventListener(DISMISS_EVENT, cb);
  return () => window.removeEventListener(DISMISS_EVENT, cb);
};
const useDismissed = () =>
  useSyncExternalStore(subscribe, () => localStorage.getItem(DISMISS_KEY) === '1', () => true);

const dismiss = () => {
  localStorage.setItem(DISMISS_KEY, '1');
  window.dispatchEvent(new Event(DISMISS_EVENT));
};

const CoffeeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" />
  </svg>
);
const HeartIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

export const DonationBanner = () => {
  const dismissed = useDismissed();
  if (dismissed || (!KOFI && !GITHUB)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
      <div className="pointer-events-auto mx-2 mt-2 flex items-center gap-3 rounded-full border border-panel-edge bg-panel/90 px-4 py-1.5 text-xs shadow-lg backdrop-blur">
        <span className="hidden text-dim sm:inline">Keep the radar spinning — fuel us with coffee, not kerosene:</span>
        <span className="text-dim sm:hidden">Support this project:</span>
        {KOFI && (
          <a href={`https://ko-fi.com/${KOFI}`} target="_blank" rel="noopener noreferrer"
            className="flex min-h-7 items-center gap-1.5 rounded-full border border-pos/40 px-2.5 text-pos transition hover:bg-pos/10">
            <CoffeeIcon /> Ko-fi
          </a>
        )}
        {GITHUB && (
          <a href={`https://github.com/sponsors/${GITHUB}`} target="_blank" rel="noopener noreferrer"
            className="flex min-h-7 items-center gap-1.5 rounded-full border border-accent/40 px-2.5 text-accent transition hover:bg-accent/10">
            <HeartIcon /> Sponsor
          </a>
        )}
        <button onClick={dismiss} aria-label="Dismiss support banner"
          className="ml-1 cursor-pointer text-dim transition hover:text-white">✕</button>
      </div>
    </div>
  );
};
