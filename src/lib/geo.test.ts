import { describe, expect, it } from 'vitest';
import {
  bearingDeg, greatCirclePath, haversineKm, latLngToVector3, pathLengthKm, pointAlongPath,
} from '@/lib/geo';

const BERLIN = { lat: 52.52, lng: 13.405 };
const NEW_YORK = { lat: 40.71, lng: -74.0 };

describe('haversineKm', () => {
  it('computes Berlin→Paris ≈ 878 km', () => {
    expect(haversineKm(52.52, 13.405, 48.8566, 2.3522)).toBeCloseTo(878, -1);
  });
  it('returns 0 for identical points', () => {
    expect(haversineKm(10, 20, 10, 20)).toBe(0);
  });
});

describe('latLngToVector3', () => {
  it('puts the north pole on +Y', () => {
    const v = latLngToVector3(90, 0, 1);
    expect(v.y).toBeCloseTo(1, 5);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(0, 5);
  });
  it('keeps points on the sphere surface', () => {
    expect(latLngToVector3(48.85, 2.35, 1).length()).toBeCloseTo(1, 5);
  });
});

describe('bearingDeg', () => {
  it('points due east along the equator', () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBeCloseTo(90, 5);
  });
  it('points due north along a meridian', () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBeCloseTo(0, 5);
  });
  it('stays within [0, 360)', () => {
    const b = bearingDeg({ lat: 0, lng: 0 }, { lat: -5, lng: -5 });
    expect(b).toBeGreaterThanOrEqual(180);
    expect(b).toBeLessThan(360);
  });
});

describe('greatCirclePath', () => {
  it('starts and ends exactly at the given points', () => {
    const path = greatCirclePath(BERLIN, NEW_YORK);
    expect(path[0]).toEqual(BERLIN);
    expect(path.at(-1)).toEqual(NEW_YORK);
  });
  it('keeps consecutive points within the requested step', () => {
    const path = greatCirclePath(BERLIN, NEW_YORK, 2);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!, b = path[i]!;
      expect(haversineKm(a.lat, a.lng, b.lat, b.lng)).toBeLessThanOrEqual(2 * 111.2 + 1e-6);
    }
  });
  it('follows the great circle, not the lat/lng rectangle', () => {
    const path = greatCirclePath(BERLIN, NEW_YORK, 1);
    const mid = path[Math.floor(path.length / 2)]!;
    expect(mid.lat).toBeGreaterThan(Math.max(BERLIN.lat, NEW_YORK.lat));
  });
  it('crosses the antimeridian the short way', () => {
    const path = greatCirclePath({ lat: -36.8, lng: 174.8 }, { lat: -33, lng: -177 });
    expect(pathLengthKm(path)).toBeLessThan(1500);
  });
});

describe('pathLengthKm', () => {
  it('sums the legs', () => {
    const path = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 0, lng: 2 }];
    expect(pathLengthKm(path)).toBeCloseTo(2 * haversineKm(0, 0, 0, 1), 6);
  });
});

describe('pointAlongPath', () => {
  const path = [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, { lat: 10, lng: 10 }];
  const leg = haversineKm(0, 0, 0, 10);

  it('interpolates within a leg and reports that leg’s heading', () => {
    const p = pointAlongPath(path, leg / 2);
    expect(p.lat).toBeCloseTo(0, 6);
    expect(p.lng).toBeCloseTo(5, 6);
    expect(p.heading).toBeCloseTo(90, 5);
  });
  it('moves onto the next leg past a waypoint', () => {
    const p = pointAlongPath(path, leg + 1);
    expect(p.lng).toBeCloseTo(10, 2);
    expect(p.heading).toBeCloseTo(0, 1);
  });
  it('clamps to the ends', () => {
    expect(pointAlongPath(path, -5)).toMatchObject({ lat: 0, lng: 0 });
    expect(pointAlongPath(path, 1e9)).toMatchObject({ lat: 10, lng: 10 });
  });
  it('returns the traveled prefix ending at the point', () => {
    const p = pointAlongPath(path, leg + 10);
    expect(p.traveled[0]).toEqual(path[0]);
    expect(p.traveled.at(-2)).toEqual(path[1]);
    expect(p.traveled.at(-1)).toMatchObject({ lat: p.lat, lng: p.lng });
    expect(p.remaining[0]).toMatchObject({ lat: p.lat, lng: p.lng });
    expect(p.remaining.at(-1)).toEqual(path[2]);
  });
});
