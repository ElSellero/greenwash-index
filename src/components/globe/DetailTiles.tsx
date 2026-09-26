'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import {
  type BufferGeometry, type Mesh, type PerspectiveCamera, Raycaster, ShaderMaterial, SRGBColorSpace,
  type Texture, TextureLoader, Vector2, Vector3,
} from 'three';
import { levelForResolution, pickCover, tileBounds, tileId, type TileKey } from '@/lib/globe/tiles';
import { CLOUDS, WATER } from './Earth';
import { EARTH_FRAG, EARTH_VERT } from './earthShaders';
import { cloudCover, cloudShift } from './earthUniforms';
import { buildTileGeometry } from './tileGeometry';
import { useAppStore } from '@/lib/store';

const SAMPLE_GRID = 9;
const RESELECT_S = 0.25;
const FADE_S = 0.45;
const RETAIN_MS = 2500;
const MAX_IN_FLIGHT = 6;
/** Just above the base sphere; finer levels sit a hair higher so they win over retained coarser ones. */
const TILE_RADIUS = 1.0004;
const LEVEL_LIFT = 0.00002;
const DEG = 180 / Math.PI;

type Entry = { key: TileKey; day?: Texture; night?: Texture; loading: boolean; failed: boolean; wantedAt: number };
type ReadyEntry = Entry & { day: Texture; night: Texture };

const noRaycast = () => null;
const ready = (e: Entry | undefined): e is ReadyEntry => Boolean(e?.day && e.night);

const budget = (hd: boolean) => {
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (coarse) return hd ? { tiles: 32, cache: 44 } : { tiles: 20, cache: 28 };
  return hd ? { tiles: 72, cache: 96 } : { tiles: 40, cache: 56 };
};
/** HD mode asks for pixels this much finer than the screen, so tiles arrive earlier and sharper. */
const HD_OVERSAMPLE = 2;

const toLatLng = (p: Vector3) => {
  const lat = Math.asin(Math.max(-1, Math.min(1, p.y))) * DEG;
  const lng = Math.atan2(p.z, -p.x) * DEG - 180;
  return { lat, lng: lng < -180 ? lng + 360 : lng };
};

/** Where a camera ray first meets the unit sphere, or null if it misses. */
const hitSphere = (origin: Vector3, dir: Vector3): { point: Vector3; distance: number } | null => {
  const b = origin.dot(dir);
  const disc = b * b - (origin.lengthSq() - 1);
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? { point: origin.clone().addScaledVector(dir, t), distance: t } : null;
};

type GlobeMaps = { water: Texture; clouds: Texture };

const TileMesh = ({ entry, sunDir, maps }: { entry: ReadyEntry; sunDir: Vector3; maps: GlobeMaps }) => {
  const mesh = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null);
  const { geometry, material } = useMemo(() => ({
    geometry: buildTileGeometry(tileBounds(entry.key), TILE_RADIUS + entry.key.z * LEVEL_LIFT),
    material: new ShaderMaterial({
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, defines: { TILE: '' }, transparent: true,
      uniforms: {
        uDay: { value: entry.day }, uNight: { value: entry.night },
        uWater: { value: maps.water }, uClouds: { value: maps.clouds }, uSunDir: { value: sunDir },
        uCloudShift: cloudShift, uCloudCover: cloudCover, uOpacity: { value: 0 },
      },
    }),
  }), [entry, sunDir, maps]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((_, delta) => {
    const opacity = mesh.current?.material.uniforms.uOpacity;
    if (opacity && opacity.value < 1) opacity.value = Math.min(1, opacity.value + delta / FADE_S);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={entry.key.z / 100} raycast={noRaycast} />;
};

/** Streams sharper NASA imagery tiles (via /api/tiles) over the part of the globe in view once zoomed in. */
export const DetailTiles = ({ sunDir }: { sunDir: Vector3 }) => {
  const [water, clouds] = useLoader(TextureLoader, [WATER, CLOUDS]) as [Texture, Texture];
  const maps = useMemo(() => ({ water, clouds }), [water, clouds]);
  const [shown, setShown] = useState<{ id: string; entry: ReadyEntry }[]>([]);
  const cache = useRef(new Map<string, Entry>());
  const inFlight = useRef(0);
  const lastPick = useRef(-Infinity);
  const tools = useMemo(() => ({ raycaster: new Raycaster(), ndc: new Vector2(), loader: new TextureLoader() }), []);
  const hd = useAppStore((s) => s.hdImagery);
  const limits = useMemo(() => budget(hd), [hd]);

  useEffect(() => {
    const entries = cache.current;
    return () => {
      for (const e of entries.values()) { e.day?.dispose(); e.night?.dispose(); }
      entries.clear();
    };
  }, []);

  const request = (e: Entry) => {
    if (e.loading || e.failed || ready(e) || inFlight.current >= MAX_IN_FLIGHT) return;
    e.loading = true;
    inFlight.current += 1;
    const id = tileId(e.key);
    const load = (layer: 'day' | 'night') => new Promise<Texture>((resolve, reject) => {
      tools.loader.load(`/api/tiles/${layer}/${id}`, (t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 4;
        resolve(t);
      }, undefined, reject);
    });
    Promise.all([load('day'), load('night')])
      .then(([day, night]) => { e.day = day; e.night = night; })
      .catch(() => { e.failed = true; })
      .finally(() => { e.loading = false; inFlight.current -= 1; });
  };

  useFrame(({ camera, size, gl, clock }) => {
    if (clock.elapsedTime - lastPick.current < RESELECT_S) return;
    lastPick.current = clock.elapsedTime;
    const cam = camera as PerspectiveCamera;
    const { raycaster, ndc } = tools;

    const points: { lat: number; lng: number }[] = [];
    let centerDistance = cam.position.length() - 1;
    for (let i = 0; i < SAMPLE_GRID; i++) {
      for (let j = 0; j < SAMPLE_GRID; j++) {
        ndc.set((2 * i) / (SAMPLE_GRID - 1) - 1, (2 * j) / (SAMPLE_GRID - 1) - 1);
        raycaster.setFromCamera(ndc, cam);
        const hit = hitSphere(raycaster.ray.origin, raycaster.ray.direction);
        if (!hit) continue;
        points.push(toLatLng(hit.point));
        if (i === (SAMPLE_GRID - 1) / 2 && j === (SAMPLE_GRID - 1) / 2) centerDistance = hit.distance;
      }
    }
    const devicePx = size.height * Math.min(gl.getPixelRatio(), 2);
    const degPerPx = ((2 * Math.tan((cam.fov * Math.PI) / 360) * centerDistance) / devicePx) * DEG;
    const level = levelForResolution(hd ? degPerPx / HD_OVERSAMPLE : degPerPx);
    const wanted = level === null || points.length === 0 ? [] : pickCover(points, level, limits.tiles);

    const now = performance.now();
    const entries = cache.current;
    const wantedIds = new Set<string>();
    for (const key of wanted) {
      const id = tileId(key);
      wantedIds.add(id);
      const e = entries.get(id) ?? { key, loading: false, failed: false, wantedAt: now };
      e.wantedAt = now;
      entries.set(id, e);
      request(e);
    }
    const wantedReady = [...wantedIds].filter((id) => ready(entries.get(id)));
    const covered = wantedReady.length === wantedIds.size;
    const retained = covered ? [] : shown.map((s) => s.id).filter((id) =>
      !wantedIds.has(id) && ready(entries.get(id)) && now - entries.get(id)!.wantedAt < RETAIN_MS);
    const next = [...retained, ...wantedReady];

    if (entries.size > limits.cache) {
      const keep = new Set(next);
      const stale = [...entries.entries()].filter(([id, e]) => !keep.has(id) && !e.loading)
        .sort((a, b) => a[1].wantedAt - b[1].wantedAt);
      for (const [id, e] of stale.slice(0, entries.size - limits.cache)) {
        e.day?.dispose(); e.night?.dispose();
        entries.delete(id);
      }
    }
    if (next.join() !== shown.map((s) => s.id).join()) {
      setShown(next.map((id) => ({ id, entry: entries.get(id) as ReadyEntry })));
    }
  });

  return (
    <group>
      {shown.map(({ id, entry }) => (
        <TileMesh key={id} entry={entry} sunDir={sunDir} maps={maps} />
      ))}
    </group>
  );
};
