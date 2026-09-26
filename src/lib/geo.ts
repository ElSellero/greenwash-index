import { Vector3 } from 'three';

export type LatLng = { lat: number; lng: number };
type Unit = [number, number, number];

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

const toUnit = ({ lat, lng }: LatLng): Unit => {
  const p = toRad(lat), l = toRad(lng);
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};

const fromUnit = ([x, y, z]: Unit): LatLng => ({
  lat: toDeg(Math.asin(clamp(z, -1, 1))),
  lng: toDeg(Math.atan2(y, x)),
});

const angleBetween = (u: Unit, v: Unit): number => {
  const cx = u[1] * v[2] - u[2] * v[1];
  const cy = u[2] * v[0] - u[0] * v[2];
  const cz = u[0] * v[1] - u[1] * v[0];
  return Math.atan2(Math.hypot(cx, cy, cz), u[0] * v[0] + u[1] * v[1] + u[2] * v[2]);
};

export const slerpLatLng = (a: LatLng, b: LatLng, t: number): LatLng => {
  const u = toUnit(a), v = toUnit(b);
  const omega = angleBetween(u, v);
  if (omega < 1e-12) return { lat: a.lat, lng: a.lng };
  const s = Math.sin(omega);
  const k0 = Math.sin((1 - t) * omega) / s;
  const k1 = Math.sin(t * omega) / s;
  return fromUnit([u[0] * k0 + v[0] * k1, u[1] * k0 + v[1] * k1, u[2] * k0 + v[2] * k1]);
};

/** Initial compass bearing from a to b, degrees in [0, 360). */
export const bearingDeg = (a: LatLng, b: LatLng): number => {
  const p1 = toRad(a.lat), p2 = toRad(b.lat), dl = toRad(b.lng - a.lng);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/** Points along the great circle a→b, no two neighbours more than `maxStepDeg` apart. */
export const greatCirclePath = (a: LatLng, b: LatLng, maxStepDeg = 1): LatLng[] => {
  const n = Math.max(1, Math.ceil(toDeg(angleBetween(toUnit(a), toUnit(b))) / maxStepDeg));
  const points = [a];
  for (let i = 1; i < n; i++) points.push(slerpLatLng(a, b, i / n));
  points.push(b);
  return points;
};

/** Densifies every leg of a polyline into great-circle steps. */
export const densifyPath = (path: LatLng[], maxStepDeg = 1): LatLng[] => {
  if (path.length < 2) return [...path];
  const out: LatLng[] = [path[0]!];
  for (let i = 1; i < path.length; i++) {
    out.push(...greatCirclePath(path[i - 1]!, path[i]!, maxStepDeg).slice(1));
  }
  return out;
};

const legKm = (a: LatLng, b: LatLng) => haversineKm(a.lat, a.lng, b.lat, b.lng);

export const pathLengthKm = (path: LatLng[]): number => {
  let km = 0;
  for (let i = 1; i < path.length; i++) km += legKm(path[i - 1]!, path[i]!);
  return km;
};

export type PathPoint = LatLng & {
  heading: number;
  traveled: LatLng[];
  remaining: LatLng[];
};

const finalBearing = (a: LatLng, b: LatLng) => (bearingDeg(b, a) + 180) % 360;

/** The point `km` along a polyline, its heading, and the path split at that point. */
export const pointAlongPath = (path: LatLng[], km: number): PathPoint => {
  const first = path[0]!;
  if (path.length < 2) return { ...first, heading: 0, traveled: [first], remaining: [first] };
  const target = Math.max(0, km);
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!;
    const len = legKm(a, b);
    if (len === 0) continue;
    if (acc + len > target) {
      const p = slerpLatLng(a, b, (target - acc) / len);
      return {
        ...p,
        heading: bearingDeg(p, b),
        traveled: [...path.slice(0, i), p],
        remaining: [p, ...path.slice(i)],
      };
    }
    acc += len;
  }
  const last = path.at(-1)!;
  return {
    ...last,
    heading: finalBearing(path.at(-2)!, last),
    traveled: [...path],
    remaining: [last],
  };
};
