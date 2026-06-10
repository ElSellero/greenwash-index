import { describe, expect, it } from 'vitest';
import { yachtPositionAt, MARINAS } from '@/lib/ingest/yachtSim';

const T = new Date('2026-06-10T12:00:00Z');

describe('yachtPositionAt', () => {
  it('is deterministic', () => {
    expect(yachtPositionAt(7, T)).toEqual(yachtPositionAt(7, T));
  });
  it('differs across vehicles', () => {
    expect(yachtPositionAt(7, T)).not.toEqual(yachtPositionAt(8, T));
  });
  it('returns coordinates within marina bounding region', () => {
    const p = yachtPositionAt(7, T);
    expect(p.lat).toBeGreaterThan(-60);
    expect(p.lat).toBeLessThan(70);
  });
  it('has both moving and moored phases across a week', () => {
    const states = Array.from({ length: 14 }, (_, i) =>
      yachtPositionAt(7, new Date(T.getTime() + i * 12 * 3600_000)).isMoving);
    expect(new Set(states).size).toBe(2);
  });
});

describe('MARINAS', () => {
  it('ships at least 12 destinations', () => {
    expect(MARINAS.length).toBeGreaterThanOrEqual(12);
  });
});
