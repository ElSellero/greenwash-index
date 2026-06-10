import { Vector3 } from 'three';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export const haversineKm = (
  aLat: number, aLng: number, bLat: number, bLng: number,
): number => {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const latLngToVector3 = (lat: number, lng: number, radius = 1): Vector3 => {
  const phi = toRad(90 - lat);
  const theta = toRad(lng + 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

/** Great-circle-ish arc with altitude bulge proportional to angular distance. */
export const arcPoints = (a: Vector3, b: Vector3, segments = 64): Vector3[] => {
  const angle = a.angleTo(b);
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new Vector3().copy(a).lerp(b, t).normalize();
    const altitude = 1 + Math.sin(Math.PI * t) * (0.04 + angle * 0.08);
    points.push(p.multiplyScalar(altitude));
  }
  return points;
};
