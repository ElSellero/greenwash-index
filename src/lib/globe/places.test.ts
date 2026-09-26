import { describe, expect, it } from 'vitest';
import { formatCoords, nearestPlace, PLACES } from '@/lib/globe/places';

describe('nearestPlace', () => {
  it('names the closest known place within range', () => {
    expect(nearestPlace(43.63, 7.32)).toBe('Nice');
    expect(nearestPlace(34.2, -118.49)).toBe('Van Nuys');
    expect(nearestPlace(53.54, 9.95)).toBe('Hamburg');
  });
  it('returns null far from any known place', () => {
    expect(nearestPlace(27.16, -34.5)).toBeNull();
  });
});

describe('PLACES', () => {
  it('holds only real coordinates', () => {
    for (const p of PLACES) {
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
    }
  });
  it('has unique names', () => {
    expect(new Set(PLACES.map((p) => p.name)).size).toBe(PLACES.length);
  });
});

describe('formatCoords', () => {
  it('writes hemispheres instead of signs', () => {
    expect(formatCoords(27.16, -34.5)).toBe('27.16° N, 34.50° W');
    expect(formatCoords(-16.92, 145.78)).toBe('16.92° S, 145.78° E');
  });
});
