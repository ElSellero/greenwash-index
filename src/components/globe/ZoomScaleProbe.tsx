'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { kmPerPixel } from '@/lib/globe/scale';
import { publishZoomScale } from './zoomScale';

const ZOOM_EPSILON = 0.002;
const PUBLISH_EVERY_S = 0.1;

/**
 * Reports the ground scale to the DOM when the user zooms. Camera flights (intro, fly-to) run with
 * the controls disabled and are ignored.
 */
export const ZoomScaleProbe = () => {
  const last = useRef({ distance: 0, at: -Infinity });
  useFrame(({ camera, size, clock, controls }) => {
    const distance = camera.position.length();
    const l = last.current;
    const userDriven = (controls as unknown as { enabled?: boolean } | null)?.enabled ?? false;
    if (!userDriven) { l.distance = distance; return; }
    if (Math.abs(distance - l.distance) < ZOOM_EPSILON || clock.elapsedTime - l.at < PUBLISH_EVERY_S) return;
    l.distance = distance;
    l.at = clock.elapsedTime;
    publishZoomScale(kmPerPixel(distance, (camera as PerspectiveCamera).fov, size.height));
  });
  return null;
};
