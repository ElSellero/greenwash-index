'use client';
import { Suspense, useMemo, useRef, useState } from 'react';
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

export const GlobeCanvas = ({ data }: { data: PositionsPayload }) => {
  // start at native sharpness; PerformanceMonitor declines on weak GPUs
  const [dpr, setDpr] = useState(() =>
    typeof window === 'undefined' ? 1.5 : Math.min(2, window.devicePixelRatio));
  const [segments, setSegments] = useState(96);
  const hasSelection = useAppStore((s) => s.selectedPersonId !== null);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 2.6], fov: 45 }}
      className="touch-none"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
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
        maxDistance={4}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        autoRotate={!reducedMotion && !hasSelection}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
};
