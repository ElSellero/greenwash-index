'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, Stars } from '@react-three/drei';
import { Vector3 } from 'three';
import { latLngToVector3 } from '@/lib/geo';
import type { GlobeVehicle } from '@/lib/globe/fleet';
import { subsolarPoint } from '@/lib/globe/sun';
import { useAppStore } from '@/lib/store';
import { Earth } from './Earth';
import { DetailTiles } from './DetailTiles';
import { VehicleMarkers } from './VehicleMarkers';
import { Trails } from './Trails';
import { CameraRig } from './CameraRig';
import { ZoomScaleProbe } from './ZoomScaleProbe';
import { SmoothZoom } from './SmoothZoom';

const FOV = 45;
const TAP_PX = 6;
const MIN_DISTANCE = 1.25;
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

/** Keeps `sunDir` pointing at the real subsolar point. */
const SunTracker = ({ sunDir }: { sunDir: Vector3 }) => {
  const last = useRef(-Infinity);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 1) return;
    last.current = clock.elapsedTime;
    const sun = subsolarPoint(new Date());
    sunDir.copy(latLngToVector3(sun.lat, sun.lng, 1));
  });
  return null;
};

/** Invisible stand-in for the planet: blocks clicks on markers behind it, and a tap on it closes the popup. */
const HitSphere = ({ onTap }: { onTap: () => void }) => (
  <mesh onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < TAP_PX) onTap(); }}>
    <sphereGeometry args={[1, 32, 32]} />
    <meshBasicMaterial colorWrite={false} depthWrite={false} />
  </mesh>
);

export const GlobeCanvas = ({ vehicles, names }: { vehicles: GlobeVehicle[]; names: Map<number, string> }) => {
  // start at native sharpness; PerformanceMonitor declines on weak GPUs
  const [dpr, setDpr] = useState(() =>
    typeof window === 'undefined' ? 1.5 : Math.min(2, window.devicePixelRatio));
  const [segments, setSegments] = useState(96);
  const hasSelection = useAppStore((s) => s.selectedPersonId !== null);
  const select = useAppStore((s) => s.select);
  const autoSpin = useAppStore((s) => s.autoSpin);
  const animate = useMemo(
    () => typeof window === 'undefined'
      || !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const sunDir = useMemo(() => {
    const sun = subsolarPoint(new Date());
    return latLngToVector3(sun.lat, sun.lng, 1);
  }, []);
  // Frame on load; widen the zoom-out limit as the viewport changes (e.g. rotate).
  const [restDistance] = useState(() => fitFraming().distance);
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
      camera={{ position: [0, 0, restDistance * 2.6], fov: FOV, near: 0.01, far: 200 }}
      className="touch-none"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // tap on empty space (not a marker, not a drag) closes the popup
      onPointerMissed={(e) => {
        const d = down.current;
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < TAP_PX) select(null);
      }}
    >
      <PerformanceMonitor
        onDecline={() => { setDpr(1); setSegments(48); }}
        onIncline={() => { setDpr(Math.min(2, window.devicePixelRatio)); setSegments(96); }}
      />
      <SunTracker sunDir={sunDir} />
      <Stars radius={40} depth={30} count={5000} factor={3} saturation={0} fade speed={animate ? 0.5 : 0} />
      <HitSphere onTap={() => select(null)} />
      <ZoomScaleProbe />
      <Suspense fallback={null}>
        <Earth segments={segments} sunDir={sunDir} animate={animate} />
        <DetailTiles sunDir={sunDir} />
        <Trails vehicles={vehicles} animate={animate} />
        <VehicleMarkers vehicles={vehicles} names={names} animate={animate} />
        <CameraRig vehicles={vehicles} restDistance={restDistance} animate={animate} />
      </Suspense>
      <SmoothZoom minDistance={MIN_DISTANCE} maxDistance={maxDistance} restDistance={restDistance} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={MIN_DISTANCE}
        maxDistance={maxDistance}
        autoRotate={animate && autoSpin && !hasSelection}
        autoRotateSpeed={0.3}
      />
    </Canvas>
  );
};
