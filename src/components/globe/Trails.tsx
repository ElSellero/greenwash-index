'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type PerspectiveCamera, type Sprite, SpriteMaterial, AdditiveBlending, Vector3 } from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { densifyPath, haversineKm, latLngToVector3, type LatLng } from '@/lib/geo';
import type { GlobeVehicle } from '@/lib/globe/fleet';
import { CONFIG } from '@/config';
import { colorOf } from './palette';
import { markerTextures } from './markerTextures';
import { createTrailMaterial, trailClock, type TrailStyle } from './trailMaterial';

const CLIMB_KM = 450;

const surfacePoints = (path: LatLng[]) =>
  densifyPath(path, 0.4).map((p) => latLngToVector3(p.lat, p.lng, CONFIG.globe.trailAltitude));

/** Great-circle flight path that climbs from the runway to cruise and stays there up to the jet. */
const flightPoints = (path: LatLng[]) => {
  const dense = densifyPath(path, 0.4);
  const { trailAltitude: ground, flightAltitude: cruise } = CONFIG.globe;
  let km = 0;
  const legs = dense.map((p, i) => (i === 0 ? 0 : (km += haversineKm(dense[i - 1]!.lat, dense[i - 1]!.lng, p.lat, p.lng))));
  const climb = Math.min(CLIMB_KM, km * 0.35);
  return dense.map((p, i) => {
    const t = climb > 0 ? Math.min(1, legs[i]! / climb) : 1;
    return latLngToVector3(p.lat, p.lng, ground + (cruise - ground) * t * t * (3 - 2 * t));
  });
};

const lengthOf = (points: Vector3[]) =>
  points.reduce((sum, p, i) => (i === 0 ? 0 : sum + p.distanceTo(points[i - 1]!)), 0);

const TrailLine = ({ points, style }: { points: Vector3[]; style: TrailStyle }) => {
  const ref = useRef<Line2>(null);
  const line = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
    const trail = new Line2(geometry, createTrailMaterial(style, lengthOf(points)));
    trail.computeLineDistances();
    trail.renderOrder = 3;
    return trail;
  }, [points, style]);

  useEffect(() => () => { line.geometry.dispose(); line.material.dispose(); }, [line]);

  useFrame(({ size }) => ref.current?.material.resolution.set(size.width, size.height));
  return <primitive ref={ref} object={line} />;
};

/** Small ring marking where a simulated voyage is headed. */
const DestinationPin = ({ at, color }: { at: LatLng; color: string }) => {
  const sprite = useRef<Sprite>(null);
  const position = useMemo(() => latLngToVector3(at.lat, at.lng, CONFIG.globe.surfaceAltitude), [at.lat, at.lng]);
  const material = useMemo(() => new SpriteMaterial({
    map: markerTextures().ring, color: new Color(color), transparent: true, opacity: 0.8,
    depthWrite: false, toneMapped: false, blending: AdditiveBlending,
  }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera, size }) => {
    const cam = camera as PerspectiveCamera;
    const worldPerPx = (2 * Math.tan((cam.fov * Math.PI) / 360) * cam.position.distanceTo(position)) / size.height;
    sprite.current?.scale.setScalar(11 * worldPerPx);
  });
  return <sprite ref={sprite} position={position} material={material} renderOrder={3} />;
};

type Spec = { key: string; points: Vector3[]; style: TrailStyle };

const specsFor = (v: GlobeVehicle): Spec[] => {
  if (!v.trail || v.trail.length < 2) return [];
  const color = colorOf(v.type);
  if (v.type === 'jet') {
    return [
      { key: 'ground', points: surfacePoints(v.trail),
        style: { color, width: 1.2, opacity: 0.28, tail: 0.3, pulses: 0, dotted: true } },
      { key: 'flight', points: flightPoints(v.trail),
        style: { color, width: 3.6, opacity: 1, tail: 0.08, pulses: 2, dotted: false } },
    ];
  }
  const specs: Spec[] = [{ key: 'wake', points: surfacePoints(v.trail),
    style: { color, width: 3.4, opacity: 1, tail: 0.1, pulses: 3, dotted: false } }];
  if (v.plan && v.plan.length > 1) {
    specs.push({ key: 'plan', points: surfacePoints(v.plan),
      style: { color, width: 1.6, opacity: 0.45, tail: 1, pulses: 0, dotted: true } });
  }
  return specs;
};

export const Trails = ({ vehicles, animate }: { vehicles: GlobeVehicle[]; animate: boolean }) => {
  useFrame(({ clock }) => { if (animate) trailClock.value = clock.elapsedTime; });
  const trails = useMemo(() => vehicles.flatMap((v) => specsFor(v).map((s) => ({ ...s, id: `${v.vehicleId}-${s.key}` }))), [vehicles]);
  const pins = vehicles.filter((v) => v.plan && v.plan.length > 1);
  return (
    <group>
      {trails.map((t) => <TrailLine key={t.id} points={t.points} style={t.style} />)}
      {pins.map((v) => <DestinationPin key={v.vehicleId} at={v.plan!.at(-1)!} color={colorOf(v.type)} />)}
    </group>
  );
};
