'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, Stars } from '@react-three/drei';
import type { DirectionalLight } from 'three';
import { Earth } from './Earth';
import { VehicleMarkers } from './VehicleMarkers';
import { RouteArcs } from './RouteArcs';
import { CameraRig } from './CameraRig';
import { useAppStore } from '@/lib/store';
import type { PositionsPayload } from '@/lib/api-types';

/** A sun that tracks the camera, so the hemisphere you look at is always lit. */
const Headlight = () => {
  const light = useRef<DirectionalLight>(null);
  useFrame(({ camera }) => light.current?.position.copy(camera.position));
  return <directionalLight ref={light} intensity={2.2} />;
};

const FOV = 45;
/**
 * Distance/zoom so the unit globe fits the viewport. Portrait phones are narrow,
 * so the horizontal field of view is the binding constraint — the camera has to
 * sit further back or the globe gets clipped left/right. Also raises the zoom-out
 * limit on those screens so the whole globe is reachable.
 */
const fitFraming = () => {
  if (typeof window === 'undefined') return { distance: 2.6, max: 4 };
  const aspect = window.innerWidth / window.innerHeight;
  const halfFov = Math.tan((FOV / 2) * (Math.PI / 180));
  const fit = 1.06 / (halfFov * Math.min(aspect, 1)); // dist where r=1 globe just fits
  return { distance: Math.max(2.6, fit), max: Math.max(4, fit + 0.8) };
};

export const GlobeCanvas = ({ data }: { data: PositionsPayload }) => {
  // start at native sharpness; PerformanceMonitor declines on weak GPUs
  const [dpr, setDpr] = useState(() =>
    typeof window === 'undefined' ? 1.5 : Math.min(2, window.devicePixelRatio));
  const [segments, setSegments] = useState(96);
  const hasSelection = useAppStore((s) => s.selectedPersonId !== null);
  const select = useAppStore((s) => s.select);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  // Frame on load; widen the zoom-out limit as the viewport changes (e.g. rotate).
  const [initialDistance] = useState(() => fitFraming().distance);
  const [maxDistance, setMaxDistance] = useState(() => fitFraming().max);
  // Last pointer-down position, so a globe rotate isn't mistaken for an empty tap.
  const down = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onResize = () => setMaxDistance(fitFraming().max);
    const onDown = (e: PointerEvent) => { down.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, initialDistance], fov: FOV }}
      className="touch-none"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // tap on empty ocean/space (not a marker, not a drag) closes the popup
      onPointerMissed={(e) => {
        const d = down.current;
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) select(null);
      }}
    >
      <PerformanceMonitor
        onDecline={() => { setDpr(1); setSegments(48); }}
        onIncline={() => { setDpr(Math.min(2, window.devicePixelRatio)); setSegments(96); }}
      />
      {/* camera-following headlight keeps the viewed hemisphere lit at any angle */}
      <ambientLight intensity={1.4} />
      <Headlight />
      <Stars radius={40} depth={30} count={4000} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.5} />
      <Suspense fallback={null}>
        <Earth segments={segments} />
        <VehicleMarkers positions={data.positions} />
        <RouteArcs trips={data.activeTrips} positions={data.positions} />
      </Suspense>
      <CameraRig positions={data.positions} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.3}
        maxDistance={maxDistance}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        autoRotate={!reducedMotion && !hasSelection}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
};
