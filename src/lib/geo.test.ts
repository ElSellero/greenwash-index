import { describe, expect, it } from 'vitest';
import { haversineKm, latLngToVector3, arcPoints } from '@/lib/geo';

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

describe('arcPoints', () => {
  it('starts/ends on surface and bulges in the middle', () => {
    const a = latLngToVector3(52.52, 13.405, 1);
    const b = latLngToVector3(40.71, -74.0, 1);
    const pts = arcPoints(a, b, 32);
    expect(pts).toHaveLength(33);
    expect(pts[0]!.length()).toBeCloseTo(1, 3);
    expect(pts[32]!.length()).toBeCloseTo(1, 3);
    expect(pts[16]!.length()).toBeGreaterThan(1.02);
  });
});
