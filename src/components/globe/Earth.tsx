'use client';
import { useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { BackSide, Mesh, TextureLoader } from 'three';
import { CONFIG } from '@/config';

export const Earth = ({ segments = 64 }: { segments?: number }) => {
  const mesh = useRef<Mesh>(null);
  const nightMap = useLoader(TextureLoader, '/textures/earth-night.png');
  const r = CONFIG.globe.radius;
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[r, segments, segments]} />
        <meshStandardMaterial
          map={nightMap}
          emissiveMap={nightMap}
          emissive="#ffd9a0"
          emissiveIntensity={1.2}
          color="#0a1428"
          roughness={1}
        />
      </mesh>
      {/* atmosphere glow: slightly larger back-side sphere */}
      <mesh>
        <sphereGeometry args={[r * 1.04, segments, segments]} />
        <meshBasicMaterial color="#1e90ff" transparent opacity={0.08} side={BackSide} />
      </mesh>
    </group>
  );
};
