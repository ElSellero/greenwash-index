'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2 } from 'three-stdlib';
import { arcPoints, latLngToVector3 } from '@/lib/geo';
import type { PositionsPayload } from '@/lib/api-types';

type ArcProps = { startLat: number; startLng: number; endLat: number; endLng: number; color: string };

const AnimatedArc = ({ startLat, startLng, endLat, endLng, color }: ArcProps) => {
  const ref = useRef<Line2>(null);
  const points = useMemo(
    () => arcPoints(latLngToVector3(startLat, startLng), latLngToVector3(endLat, endLng)),
    [startLat, startLng, endLat, endLng],
  );
  useFrame((_, delta) => {
    const mat = ref.current?.material;
    if (mat) mat.dashOffset -= delta * 0.15; // marching dashes = direction of travel
  });
  return (
    <Line ref={ref} points={points} color={color} lineWidth={1.5}
      dashed dashScale={20} dashSize={0.5} gapSize={0.3} transparent opacity={0.9} />
  );
};

export const RouteArcs = ({ trips, positions }: {
  trips: PositionsPayload['activeTrips'];
  positions: PositionsPayload['positions'];
}) => {
  const byVehicle = useMemo(
    () => new Map(positions.map((p) => [p.vehicleId, p])),
    [positions],
  );
  return (
    <group>
      {trips.map((t) => {
        const current = byVehicle.get(t.vehicleId);
        if (!current) return null;
        return (
          <AnimatedArc key={t.id}
            startLat={t.startLat} startLng={t.startLng}
            endLat={current.lat} endLng={current.lng}
            color={current.type === 'jet' ? '#38bdf8' : '#22ff88'} />
        );
      })}
    </group>
  );
};
