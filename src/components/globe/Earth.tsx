'use client';
import { useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending, BackSide, Color, ShaderMaterial, SRGBColorSpace, TextureLoader,
} from 'three';
import { CONFIG } from '@/config';

/*
 * Night texture: 8k from Solar System Scope (CC BY 4.0, attribution on /methodology),
 * falling back to the 2k three.js example texture on GPUs that cap at 4096.
 */
const TEXTURE_8K = '/textures/earth-night-8k.jpg';
const TEXTURE_2K = '/textures/earth-night.png';

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
  const textureUrl = gl.capabilities.maxTextureSize >= 8192 ? TEXTURE_8K : TEXTURE_2K;
  const nightMap = useLoader(TextureLoader, textureUrl);

  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());

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
          map={nightMap}
          map-colorSpace={SRGBColorSpace}
          map-anisotropy={anisotropy}
          emissiveMap={nightMap}
          emissive="#ffd9a0"
          emissiveIntensity={1.2}
          color="#0a1428"
          roughness={1}
        />
      </mesh>
      <mesh material={atmosphereMaterial}>
        <sphereGeometry args={[r * 1.13, segments, segments]} />
      </mesh>
    </group>
  );
};
