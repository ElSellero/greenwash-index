'use client';
import { useMemo } from 'react';
import { latLngToVector3 } from '@/lib/geo';
import { useAppStore } from '@/lib/store';
import { CONFIG } from '@/config';
import type { PositionsPayload } from '@/lib/api-types';

const MARKER_COLORS = { jet: '#38bdf8', yacht: '#22ff88' } as const;

export const VehicleMarkers = ({ positions }: { positions: PositionsPayload['positions'] }) => {
  const select = useAppStore((s) => s.select);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);

  const markers = useMemo(
    () => positions.map((p) => ({
      ...p,
      vec: latLngToVector3(p.lat, p.lng, CONFIG.globe.markerAltitude),
    })),
    [positions],
  );

  return (
    <group>
      {markers.map((m) => {
        const isSelected = m.vehicleId === selectedVehicleId;
        const color = MARKER_COLORS[m.type as keyof typeof MARKER_COLORS] ?? '#ffffff';
        return (
          <mesh
            key={m.vehicleId}
            position={m.vec}
            onClick={(e) => { e.stopPropagation(); select(m.personId, m.vehicleId); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <sphereGeometry args={[isSelected ? 0.016 : 0.01, 12, 12]} />
            <meshBasicMaterial color={isSelected ? '#ffffff' : color} />
            {m.isMoving && (
              <mesh>
                <ringGeometry args={[0.018, 0.024, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} />
              </mesh>
            )}
          </mesh>
        );
      })}
    </group>
  );
};
