'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending, BackSide, type Mesh, NoColorSpace, ShaderMaterial, SRGBColorSpace, type Texture,
  TextureLoader, type Vector3,
} from 'three';
import { CONFIG } from '@/config';
import {
  ATMOSPHERE_FRAG, ATMOSPHERE_VERT, CLOUDS_FRAG, CLOUDS_VERT, EARTH_FRAG, EARTH_VERT,
} from './earthShaders';
import { cloudCover, cloudShift } from './earthUniforms';

/*
 * Day, night-lights, clouds and specular (ocean mask) maps from Solar System Scope
 * (CC BY 4.0, attribution on /methodology). The 8k day / 4k night pair is GPU-gated
 * with a 2k fallback below 8192 maxTextureSize.
 */
const HI = { day: '/textures/earth-day-8k.jpg', night: '/textures/earth-night-4k.jpg' };
const LO = { day: '/textures/earth-day-2k.jpg', night: '/textures/earth-night-2k.jpg' };
export const WATER = '/textures/earth-water-1k.jpg';
export const CLOUDS = '/textures/earth-clouds-2k.jpg';
const CLOUD_DRIFT = 0.006;
/** Camera distances between which the cloud layer thins out, so close-ups show the ground. */
const CLOUDS_GONE = 1.35;
const CLOUDS_FULL = 1.95;

const noRaycast = () => null;

export const Earth = ({ segments = 96, sunDir, animate }: {
  segments?: number;
  /** World-space direction to the sun; mutated in place by the caller. */
  sunDir: Vector3;
  animate: boolean;
}) => {
  const gl = useThree((s) => s.gl);
  const maps = gl.capabilities.maxTextureSize >= 8192 ? HI : LO;
  const [day, night, water, clouds] = useLoader(TextureLoader, [maps.day, maps.night, WATER, CLOUDS]) as
    [Texture, Texture, Texture, Texture];
  const cloudShell = useRef<Mesh>(null);

  const materials = useMemo(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    for (const t of [day, night]) { t.colorSpace = SRGBColorSpace; t.anisotropy = anisotropy; }
    for (const t of [water, clouds]) t.colorSpace = NoColorSpace;
    const sun = { value: sunDir };
    return {
      earth: new ShaderMaterial({
        vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
        uniforms: {
          uDay: { value: day }, uNight: { value: night }, uWater: { value: water },
          uClouds: { value: clouds }, uSunDir: sun, uCloudShift: cloudShift, uCloudCover: cloudCover,
          uOpacity: { value: 1 },
        },
      }),
      clouds: new ShaderMaterial({
        vertexShader: CLOUDS_VERT, fragmentShader: CLOUDS_FRAG,
        uniforms: { uClouds: { value: clouds }, uSunDir: sun, uCloudCover: cloudCover },
        transparent: true, depthWrite: false,
      }),
      atmosphere: new ShaderMaterial({
        vertexShader: ATMOSPHERE_VERT, fragmentShader: ATMOSPHERE_FRAG,
        uniforms: { uSunDir: sun },
        blending: AdditiveBlending, side: BackSide, transparent: true, depthWrite: false,
      }),
    };
  }, [gl, day, night, water, clouds, sunDir]);

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  useFrame(({ camera }, delta) => {
    const shell = cloudShell.current;
    if (!shell) return;
    if (animate) shell.rotation.y += delta * CLOUD_DRIFT;
    // rotating the shell by +a about Y shows cloud texel u - a/2π above surface texel u
    cloudShift.value = -shell.rotation.y / (2 * Math.PI);
    const t = Math.min(1, Math.max(0, (camera.position.length() - CLOUDS_GONE) / (CLOUDS_FULL - CLOUDS_GONE)));
    cloudCover.value = 0.1 + 0.9 * t * t * (3 - 2 * t);
  });

  const r = CONFIG.globe.radius;
  return (
    <group>
      <mesh material={materials.earth} raycast={noRaycast}>
        <sphereGeometry args={[r, segments, segments]} />
      </mesh>
      <mesh ref={cloudShell} material={materials.clouds} raycast={noRaycast} renderOrder={1}>
        <sphereGeometry args={[r * 1.008, segments, segments]} />
      </mesh>
      <mesh material={materials.atmosphere} raycast={noRaycast} renderOrder={2}>
        <sphereGeometry args={[r * 1.1, segments, segments]} />
      </mesh>
    </group>
  );
};
