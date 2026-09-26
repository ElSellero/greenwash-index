'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Altitude change per wheel pixel (exponential, so a mouse notch and a trackpad swipe feel alike). */
const WHEEL_GAIN = 0.0015;
const LINE_PX = 16;
const EASE_PER_S = 9;
const BASE_ROTATE_SPEED = 0.4;
const MIN_ROTATE_FACTOR = 0.12;

type Controls = { enabled: boolean; rotateSpeed: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Replaces OrbitControls' step zoom (one fixed jump per wheel event — frantic on trackpads) with an eased,
 * altitude-relative zoom for wheel and pinch, and slows dragging as the camera nears the surface.
 */
export const SmoothZoom = ({ minDistance, maxDistance, restDistance }: {
  minDistance: number;
  maxDistance: number;
  restDistance: number;
}) => {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const target = useRef<number | null>(null);
  const bounds = useRef({ minDistance, maxDistance });

  useEffect(() => { bounds.current = { minDistance, maxDistance }; }, [minDistance, maxDistance]);

  useEffect(() => {
    const el = gl.domElement;
    const zoomBy = (factor: number) => {
      const altitude = target.current ?? camera.position.length() - 1;
      const { minDistance: lo, maxDistance: hi } = bounds.current;
      target.current = clamp(altitude * factor, lo - 1, hi - 1);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * LINE_PX : e.deltaMode === 2 ? e.deltaY * el.clientHeight : e.deltaY;
      zoomBy(Math.exp(px * WHEEL_GAIN));
    };
    const touches = new Map<number, { x: number; y: number }>();
    let span: number | null = null;
    const spanOf = () => {
      const [a, b] = [...touches.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      span = spanOf();
    };
    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const next = spanOf();
      if (span && next) zoomBy(span / next);
      span = next;
    };
    const onUp = (e: PointerEvent) => { touches.delete(e.pointerId); span = spanOf(); };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [gl, camera]);

  useFrame((state, delta) => {
    const controls = state.controls as unknown as Controls | null;
    const altitude = state.camera.position.length() - 1;
    if (controls) {
      controls.rotateSpeed = BASE_ROTATE_SPEED * clamp(altitude / (restDistance - 1), MIN_ROTATE_FACTOR, 1);
    }
    const goal = target.current;
    if (goal === null) return;
    if (controls && !controls.enabled) { target.current = null; return; }
    const next = altitude + (goal - altitude) * (1 - Math.exp(-delta * EASE_PER_S));
    state.camera.position.setLength(1 + next);
    if (Math.abs(goal - next) < 1e-4) target.current = null;
  });

  return null;
};
