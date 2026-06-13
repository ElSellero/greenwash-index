'use client';
import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { SRGBColorSpace, TextureLoader } from 'three';
import { latLngToVector3 } from '@/lib/geo';
import { useAppStore } from '@/lib/store';
import { CONFIG } from '@/config';
import type { PositionsPayload } from '@/lib/api-types';

const MARKER_COLORS = { jet: '#38bdf8', yacht: '#22ff88' } as const;

export const VehicleMarkers = ({ positions }: { positions: PositionsPayload['positions'] }) => {
  const select = useAppStore((s) => s.select);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const [jetTex, yachtTex] = useLoader(TextureLoader, ['/icons/jet.svg', '/icons/yacht.svg']);

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
        const size = isSelected ? 0.075 : 0.05;
        return (
          <group key={m.vehicleId} position={m.vec}>
            <sprite
              scale={[size, size, 1]}
              onClick={(e) => { e.stopPropagation(); select(m.personId, m.vehicleId); }}
              onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <spriteMaterial
                map={m.type === 'jet' ? jetTex : yachtTex}
                map-colorSpace={SRGBColorSpace}
                color={isSelected ? '#ffffff' : color}
                depthWrite={false}
              />
            </sprite>
            {m.isMoving && (
              <mesh>
                <ringGeometry args={[0.032, 0.04, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};
