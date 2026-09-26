import { describe, expect, it } from 'vitest';
import { formatDistance, kmPerPixel, niceScale } from '@/lib/globe/scale';

describe('niceScale', () => {
  it('picks the longest 1-2-5 length that fits the bar', () => {
    expect(niceScale(4, 120)).toEqual({ km: 200, px: 50 });
    expect(niceScale(0.9, 120)).toEqual({ km: 100, px: 100 / 0.9 });
    expect(niceScale(30, 120)).toEqual({ km: 2000, px: 2000 / 30 });
  });
  it('handles sub-kilometre scales', () => {
    const fine = niceScale(0.004, 120);
    expect(fine.km).toBe(0.2);
    expect(fine.px).toBeCloseTo(50, 9);
  });
});

describe('kmPerPixel', () => {
  it('grows with the camera’s height above the surface', () => {
    const low = kmPerPixel(1.2, 45, 900);
    const high = kmPerPixel(2.6, 45, 900);
    expect(high / low).toBeCloseTo(1.6 / 0.2, 6);
  });
  it('measures the ground under the camera in km', () => {
    expect(kmPerPixel(2, 90, 1000)).toBeCloseTo((2 * 6371) / 1000, 6);
  });
});

describe('formatDistance', () => {
  it('uses km with thousands separators, metres below one km', () => {
    expect(formatDistance(2000)).toBe('2,000 km');
    expect(formatDistance(50)).toBe('50 km');
    expect(formatDistance(0.5)).toBe('500 m');
  });
});
