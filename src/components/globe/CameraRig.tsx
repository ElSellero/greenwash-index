'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { type Camera, type Clock, Quaternion, type Vector3 } from 'three';
import { latLngToVector3 } from '@/lib/geo';
import { focusedVehicle, type GlobeVehicle } from '@/lib/globe/fleet';
import { useAppStore } from '@/lib/store';

const FOCUS_DISTANCE = 1.9;
const INTRO_FROM = { lat: 8, lng: -95 };
const INTRO_TO = { lat: 28, lng: -22 };

type Flight = {
  from: Vector3; spin: Quaternion; d0: number; d1: number;
  lift: number; start: number; duration: number; ease: (t: number) => number;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 4;

const plan = (camera: Camera, clock: Clock, dir: Vector3, distance: number,
  ease: Flight['ease'], minDuration: number): Flight => {
  const u0 = camera.position.clone().normalize();
  const angle = u0.angleTo(dir);
  return {
    from: u0, spin: new Quaternion().setFromUnitVectors(u0, dir),
    d0: camera.position.length(), d1: distance, lift: Math.min(1.1, angle * 0.4),
    start: clock.elapsedTime, duration: Math.max(minDuration, 1 + angle * 0.45), ease,
  };
};

const place = (camera: Camera, dir: Vector3, distance: number) => {
  camera.position.copy(dir).multiplyScalar(distance);
  camera.lookAt(0, 0, 0);
};

/** Flies the camera along the sphere (never through it): on load, and to each new selection. */
export const CameraRig = ({ vehicles, restDistance, animate }: {
  vehicles: GlobeVehicle[];
  restDistance: number;
  animate: boolean;
}) => {
  const camera = useThree((s) => s.camera);
  const clock = useThree((s) => s.clock);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);
  const flight = useRef<Flight | null>(null);
  const latest = useRef(vehicles);

  useEffect(() => { latest.current = vehicles; }, [vehicles]);

  useEffect(() => {
    const rest = latLngToVector3(INTRO_TO.lat, INTRO_TO.lng, 1);
    if (!animate) { place(camera, rest, restDistance); return; }
    place(camera, latLngToVector3(INTRO_FROM.lat, INTRO_FROM.lng, 1), restDistance * 2.6);
    flight.current = plan(camera, clock, rest, restDistance, easeOut, 3.2);
  }, [camera, clock, animate, restDistance]);

  useEffect(() => {
    const target = focusedVehicle(latest.current, selectedPersonId, selectedVehicleId);
    if (!target) return;
    const dir = latLngToVector3(target.lat, target.lng, 1);
    if (!animate) { place(camera, dir, FOCUS_DISTANCE); return; }
    flight.current = plan(camera, clock, dir, FOCUS_DISTANCE, easeInOut, 1.1);
  }, [selectedVehicleId, selectedPersonId, camera, clock, animate]);

  useFrame((state) => {
    const f = flight.current;
    if (!f) return;
    const raw = Math.min(1, (clock.elapsedTime - f.start) / f.duration);
    const t = f.ease(raw);
    const dir = f.from.clone().applyQuaternion(new Quaternion().slerp(f.spin, t));
    place(camera, dir, f.d0 + (f.d1 - f.d0) * t + f.lift * Math.sin(Math.PI * t));
    const controls = state.controls as unknown as { enabled: boolean } | null;
    if (controls) controls.enabled = raw >= 1;
    if (raw >= 1) flight.current = null;
  });

  return null;
};
