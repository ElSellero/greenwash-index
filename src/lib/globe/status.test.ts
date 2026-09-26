import { describe, expect, it } from 'vitest';
import type { GlobeVehicle } from '@/lib/globe/fleet';
import { describeActivity, describeLocation, describeStatus, formatAge, formatWhen } from '@/lib/globe/status';

const NOW = new Date('2026-09-26T20:00:00Z');
const vehicle = (over: Partial<GlobeVehicle>): GlobeVehicle => ({
  vehicleId: 1, personId: 1, type: 'jet', vehicleName: 'Gulfstream G650', trackingMode: 'live',
  lat: 0, lng: 0, heading: 0, isMoving: false, source: 'adsb', recordedAt: NOW,
  status: 'parked', trail: null, plan: null, destination: null,
  location: { name: 'near Nice', at: NOW, kind: 'fix' },
  ...over,
});

describe('formatAge', () => {
  it('uses minutes, hours, days and months', () => {
    expect(formatAge(5 * 60_000)).toBe('5 min');
    expect(formatAge(3 * 3_600_000)).toBe('3 h');
    expect(formatAge(4 * 86_400_000)).toBe('4 d');
    expect(formatAge(95 * 86_400_000)).toBe('3 mo');
  });
});

describe('describeStatus', () => {
  it('says a moving jet is in flight', () => {
    expect(describeStatus(vehicle({ status: 'moving' }), NOW)).toBe('in flight · live');
  });
  it('names the destination of a simulated voyage', () => {
    expect(describeStatus(vehicle({
      type: 'yacht', status: 'moving', trackingMode: 'simulated', source: 'sim', destination: 'St. Barts',
    }), NOW)).toBe('under way → St. Barts · simulated');
  });
  it('moors yachts and parks jets', () => {
    expect(describeStatus(vehicle({ type: 'yacht', source: 'ais' }), NOW)).toBe('moored · live');
    expect(describeStatus(vehicle({ trackingMode: 'simulated', source: 'sim' }), NOW)).toBe('parked · simulated');
  });
  it('reports how long the signal has been lost', () => {
    expect(describeStatus(vehicle({
      status: 'stale', recordedAt: new Date(NOW.getTime() - 2 * 86_400_000),
    }), NOW)).toBe('signal lost · last seen 2 d ago');
  });
});

describe('describeActivity', () => {
  it('leaves the age of a lost signal to the location line', () => {
    expect(describeActivity(vehicle({ status: 'stale' }))).toBe('signal lost');
  });
  it('leaves provenance to the badge next to it', () => {
    expect(describeActivity(vehicle({ trackingMode: 'simulated', source: 'sim' }))).toBe('parked');
    expect(describeActivity(vehicle({
      type: 'yacht', status: 'moving', trackingMode: 'simulated', source: 'sim', destination: 'St. Barts',
    }))).toBe('under way → St. Barts');
  });
});

describe('formatWhen', () => {
  it('shows day, month and time, adding the year only when it differs', () => {
    expect(formatWhen(new Date('2026-09-24T00:00:00Z'), NOW, 'UTC')).toBe('Sep 24, 00:00');
    expect(formatWhen(new Date('2025-12-31T23:30:00Z'), NOW, 'UTC')).toBe('Dec 31, 2025, 23:30');
  });
});

describe('describeLocation', () => {
  it('says since when a simulated vehicle has been there', () => {
    expect(describeLocation(vehicle({
      location: { name: 'Nice Côte d’Azur Airport', at: new Date('2026-09-24T00:00:00Z'), kind: 'since' },
    }), NOW, 'UTC')).toBe('Nice Côte d’Azur Airport · since Sep 24, 00:00');
  });
  it('says when a live fix was taken and how long ago', () => {
    expect(describeLocation(vehicle({
      location: { name: 'near Van Nuys', at: new Date(NOW.getTime() - 3 * 3_600_000), kind: 'fix' },
    }), NOW, 'UTC')).toBe('near Van Nuys · position from Sep 26, 17:00 (3 h ago)');
  });
});
