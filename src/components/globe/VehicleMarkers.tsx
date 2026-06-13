'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Group, SpriteMaterial, SRGBColorSpace, type Texture, TextureLoader } from 'three';
import { latLngToVector3 } from '@/lib/geo';
import { useAppStore } from '@/lib/store';
import { CONFIG } from '@/config';
import type { PositionsPayload } from '@/lib/api-types';

const MARKER_COLORS = { jet: '#38bdf8', yacht: '#22ff88' } as const;
const DEG2RAD = Math.PI / 180;

type Pos = PositionsPayload['positions'][number];

const Marker = ({ pos, texture }: { pos: Pos; texture: Texture }) => {
  const group = useRef<Group>(null);
  const material = useRef<SpriteMaterial>(null);
  const select = useAppStore((s) => s.select);
  const isSelected = useAppStore((s) => s.selectedVehicleId === pos.vehicleId);
  const color = MARKER_COLORS[pos.type as keyof typeof MARKER_COLORS] ?? '#ffffff';
  const vec = useMemo(
    () => latLngToVector3(pos.lat, pos.lng, CONFIG.globe.markerAltitude),
    [pos.lat, pos.lng],
  );

  // Keep apparent size ~constant across zoom (markers vanished when zoomed out),
  // and point the icon along its heading.
  useFrame(({ camera }) => {
    if (!group.current) return;
    const dist = camera.position.length();
    const base = Math.min(1.8, Math.max(0.7, dist / 2.6));
    group.current.scale.setScalar(isSelected ? base * 1.5 : base);
    if (material.current && pos.heading != null) {
      material.current.rotation = -pos.heading * DEG2RAD;
    }
  });

  return (
    <group ref={group} position={vec}>
      <sprite
        scale={[0.05, 0.05, 1]}
        onClick={(e) => { e.stopPropagation(); select(pos.personId, pos.vehicleId); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <spriteMaterial
          ref={material}
          map={texture}
          map-colorSpace={SRGBColorSpace}
          color={isSelected ? '#ffffff' : color}
          depthWrite={false}
        />
      </sprite>
      {pos.isMoving && (
        <mesh>
          <ringGeometry args={[0.034, 0.042, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

export const VehicleMarkers = ({ positions }: { positions: PositionsPayload['positions'] }) => {
  const textures = useLoader(TextureLoader, ['/icons/jet.svg', '/icons/yacht.svg']);
  const jetTex = textures[0]!;
  const yachtTex = textures[1]!;
  return (
    <group>
      {positions.map((p) => (
        <Marker key={p.vehicleId} pos={p} texture={p.type === 'jet' ? jetTex : yachtTex} />
      ))}
    </group>
  );
};
