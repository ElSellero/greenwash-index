'use client';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { latLngToVector3 } from '@/lib/geo';
import { useAppStore } from '@/lib/store';
import type { PositionsPayload } from '@/lib/api-types';

export const CameraRig = ({ positions }: { positions: PositionsPayload['positions'] }) => {
  const camera = useThree((s) => s.camera);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);

  useEffect(() => {
    const target =
      positions.find((p) => p.vehicleId === selectedVehicleId) ??
      positions.find((p) => p.personId === selectedPersonId);
    if (!target) return;
    const destination = latLngToVector3(target.lat, target.lng, 1).multiplyScalar(1.9);
    gsap.to(camera.position, {
      x: destination.x, y: destination.y, z: destination.z,
      duration: 1.4,
      ease: 'power3.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0),
    });
  }, [selectedVehicleId, selectedPersonId, positions, camera]);

  return null;
};
