import { describe, expect, it } from 'vitest';
import { nextTripState, type TripState } from '@/lib/ingest/trips';

const NOW = new Date('2026-06-10T12:00:00Z');

describe('nextTripState', () => {
  it('opens a trip when moving with no active trip', () => {
    const r = nextTripState(null, { lat: 48, lng: 11, isMoving: true }, NOW);
    expect(r.action).toBe('open');
  });
  it('extends an active trip and accumulates distance', () => {
    const active: TripState = { startLat: 48, startLng: 11, lastLat: 48, lastLng: 11, distanceKm: 0, startedAt: NOW };
    const r = nextTripState(active, { lat: 49, lng: 11, isMoving: true }, NOW);
    expect(r.action).toBe('extend');
    if (r.action === 'extend') expect(r.distanceKm).toBeCloseTo(111, 0);
  });
  it('closes the trip when movement stops', () => {
    const active: TripState = { startLat: 48, startLng: 11, lastLat: 49, lastLng: 11, distanceKm: 111, startedAt: NOW };
    const r = nextTripState(active, { lat: 49.01, lng: 11, isMoving: false }, NOW);
    expect(r.action).toBe('close');
    if (r.action === 'close') expect(r.totalKm).toBeGreaterThan(111);
  });
  it('does nothing when idle with no trip', () => {
    expect(nextTripState(null, { lat: 0, lng: 0, isMoving: false }, NOW).action).toBe('none');
  });
  it('ignores GPS jitter < 1 km while extending', () => {
    const active: TripState = { startLat: 48, startLng: 11, lastLat: 48, lastLng: 11, distanceKm: 50, startedAt: NOW };
    const r = nextTripState(active, { lat: 48.001, lng: 11, isMoving: true }, NOW);
    if (r.action === 'extend') expect(r.distanceKm).toBe(50);
  });
});
