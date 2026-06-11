'use client';
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Earth } from './Earth';
import { VehicleMarkers } from './VehicleMarkers';
import { RouteArcs } from './RouteArcs';
import { CameraRig } from './CameraRig';
import type { PositionsPayload } from '@/lib/api-types';

export const GlobeCanvas = ({ data }: { data: PositionsPayload }) => {
  const [dpr, setDpr] = useState(1.5);
  const [segments, setSegments] = useState(64);
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 2.6], fov: 45 }}
      className="touch-none"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        onDecline={() => { setDpr(1); setSegments(32); }}
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
      />
      <ambientLight intensity={0.4} />
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
      />
    </Canvas>
  );
};
