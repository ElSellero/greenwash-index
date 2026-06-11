'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending, BackSide, Color, Mesh, ShaderMaterial, SRGBColorSpace, TextureLoader,
} from 'three';
import { CONFIG } from '@/config';

/*
 * Day/clouds textures from Solar System Scope (CC BY 4.0, attribution on
 * /methodology). 8k day map is GPU-gated with a 2k fallback below 8192
 * maxTextureSize.
 */
const DAY_8K = '/textures/earth-day-8k.jpg';
const DAY_2K = '/textures/earth-day-2k.jpg';
const CLOUDS_2K = '/textures/earth-clouds-2k.jpg';

/* Classic rim-glow atmosphere: back-side shell, additive fresnel falloff. */
const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
    gl_FragColor = vec4(uColor, 1.0) * intensity;
  }
`;

export const Earth = ({ segments = 96 }: { segments?: number }) => {
  const gl = useThree((s) => s.gl);
  const dayUrl = gl.capabilities.maxTextureSize >= 8192 ? DAY_8K : DAY_2K;
  const [dayMap, cloudMap] = useLoader(TextureLoader, [dayUrl, CLOUDS_2K]);
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());

  const clouds = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (clouds.current) clouds.current.rotation.y += delta * 0.006; // slow drift
  });

  const atmosphereMaterial = useMemo(
    () => new ShaderMaterial({
      vertexShader: ATMOSPHERE_VERT,
      fragmentShader: ATMOSPHERE_FRAG,
      uniforms: { uColor: { value: new Color('#2f7fff') } },
      blending: AdditiveBlending,
      side: BackSide,
      transparent: true,
      depthWrite: false,
    }),
    [],
  );

  const r = CONFIG.globe.radius;
  return (
    <group>
      <mesh>
        <sphereGeometry args={[r, segments, segments]} />
        <meshStandardMaterial
          map={dayMap}
          map-colorSpace={SRGBColorSpace}
          map-anisotropy={anisotropy}
          roughness={1}
        />
      </mesh>
      {/* cloud shell: additive so dark areas vanish, white clouds glow softly */}
      <mesh ref={clouds}>
        <sphereGeometry args={[r * 1.012, segments, segments]} />
        <meshStandardMaterial
          map={cloudMap}
          map-colorSpace={SRGBColorSpace}
          transparent
          opacity={0.35}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh material={atmosphereMaterial}>
        <sphereGeometry args={[r * 1.13, segments, segments]} />
      </mesh>
    </group>
  );
};
