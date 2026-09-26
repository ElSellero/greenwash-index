'use client';
import { useSyncExternalStore } from 'react';

type Reading = { kmPerPx: number; at: number };

let reading: Reading | null = null;
const listeners = new Set<() => void>();

/** Called from inside the canvas whenever the zoom changes. */
export const publishZoomScale = (kmPerPx: number): void => {
  reading = { kmPerPx, at: performance.now() };
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** The latest ground resolution under the camera, for DOM overlays outside the canvas. */
export const useZoomScale = (): Reading | null => useSyncExternalStore(subscribe, () => reading, () => null);
