import { describe, expect, it } from 'vitest';
import { fanOut } from '@/lib/globe/fanOut';

describe('fanOut', () => {
  it('leaves a lone vehicle where it is', () => {
    expect(fanOut([{ id: 1, lat: 43.7, lng: 7.4 }]).get(1)).toEqual({ index: 0, count: 1 });
  });

  it('groups vehicles parked at the same spot and numbers them by id', () => {
    const slots = fanOut([
      { id: 9, lat: 43.27, lng: 6.64 },
      { id: 2, lat: 43.27, lng: 6.64 },
      { id: 5, lat: 43.28, lng: 6.65 },
    ]);
    expect([slots.get(2), slots.get(5), slots.get(9)]).toEqual([
      { index: 0, count: 3 }, { index: 1, count: 3 }, { index: 2, count: 3 },
    ]);
  });

  it('keeps separate places separate', () => {
    const slots = fanOut([
      { id: 1, lat: 43.7, lng: 7.4 },
      { id: 2, lat: 25.8, lng: -80.2 },
    ]);
    expect(slots.get(1)!.count).toBe(1);
    expect(slots.get(2)!.count).toBe(1);
  });

  it('chains neighbours into one group', () => {
    const slots = fanOut([
      { id: 1, lat: 43.50, lng: 7.0 },
      { id: 2, lat: 43.62, lng: 7.0 },
      { id: 3, lat: 43.74, lng: 7.0 },
    ], 15);
    expect(slots.get(1)!.count).toBe(3);
  });
});
