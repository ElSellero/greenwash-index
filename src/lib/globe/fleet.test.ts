import { describe, expect, it } from 'vitest';
import type { PositionsPayload } from '@/lib/api-types';
import { MARINAS, simulatedPosition, simulatedStay, simVoyageAt } from '@/lib/ingest/yachtSim';
import { focusedVehicle, resolveFleet } from '@/lib/globe/fleet';

type Position = PositionsPayload['positions'][number];
type Trip = PositionsPayload['activeTrips'][number];

const HOUR = 3_600_000;
const NOW = new Date('2026-09-24T20:00:00Z'); // Thursday evening: simulated yachts are sailing

const position = (over: Partial<Position>): Position => ({
  vehicleId: 1, personId: 1, type: 'jet', vehicleName: 'Gulfstream G650',
  trackingMode: 'live', lat: 40, lng: -40, heading: 90, isMoving: false,
  source: 'adsb', recordedAt: new Date(NOW.getTime() - 10 * 60_000),
  ...over,
});

const trip = (over: Partial<Trip>): Trip => ({
  id: 1, vehicleId: 1, status: 'active', startLat: 34, startLng: -118, lastLat: 40, lastLng: -40,
  distanceKm: 0, startedAt: new Date(NOW.getTime() - 5 * HOUR), endedAt: null,
  ...over,
});

const resolve = (positions: Position[], activeTrips: Trip[] = []) =>
  resolveFleet({ positions, activeTrips }, NOW);

describe('resolveFleet — live vehicles', () => {
  it('draws a fresh flight from where its trip started to where the jet is now', () => {
    const [jet] = resolve([position({ isMoving: true })], [trip({})]);
    expect(jet!.status).toBe('moving');
    expect(jet!.isMoving).toBe(true);
    expect(jet!.trail?.[0]).toEqual({ lat: 34, lng: -118 });
    expect(jet!.trail?.at(-1)).toEqual({ lat: 40, lng: -40 });
  });

  it('marks a flight as signal-lost once its last fix is hours old', () => {
    const [jet] = resolve(
      [position({ isMoving: true, recordedAt: new Date(NOW.getTime() - 4 * HOUR) })], [trip({})]);
    expect(jet!.status).toBe('stale');
    expect(jet!.isMoving).toBe(false);
    expect(jet!.trail).toBeNull();
  });

  it('gives a sailing yacht more slack than a jet before calling it stale', () => {
    const [yacht] = resolve([position({
      type: 'yacht', source: 'ais', isMoving: true, lat: 43.6, lng: 7.3,
      recordedAt: new Date(NOW.getTime() - 6 * HOUR),
    })], [trip({ startLat: 41.1, startLng: 9.6 })]);
    expect(yacht!.status).toBe('moving');
  });

  it('routes a live yacht’s trail over water from its trip start', () => {
    const [yacht] = resolve([position({
      type: 'yacht', source: 'ais', isMoving: true, lat: 43.6, lng: 7.4,
    })], [trip({ startLat: 42.64, startLng: 18.1 })]);
    expect(yacht!.trail!.length).toBeGreaterThan(2);
    expect(Math.min(...yacht!.trail!.map((p) => p.lat))).toBeLessThan(38.5);
  });

  it('keeps a recently seen parked vehicle parked', () => {
    const [jet] = resolve([position({ recordedAt: new Date(NOW.getTime() - 10 * 24 * HOUR) })]);
    expect(jet!.status).toBe('parked');
  });

  it('treats a position older than a month as signal lost', () => {
    const [jet] = resolve([position({ recordedAt: new Date(NOW.getTime() - 40 * 24 * HOUR) })]);
    expect(jet!.status).toBe('stale');
  });

  it('accepts recordedAt as the ISO string the positions API returns', () => {
    const [jet] = resolve([position({
      recordedAt: new Date(NOW.getTime() - 10 * 60_000).toISOString() as unknown as Date,
    })]);
    expect(jet!.status).toBe('parked');
  });
});

describe('resolveFleet — simulated vehicles', () => {
  it('places a simulated yacht where the simulation has it now, not at its last stored fix', () => {
    const [yacht] = resolve([position({
      vehicleId: 10, type: 'yacht', trackingMode: 'simulated', source: 'sim', lat: 0, lng: 0,
      recordedAt: new Date(NOW.getTime() - 20 * HOUR),
    })]);
    const expected = simulatedPosition({ id: 10, type: 'yacht' }, NOW);
    expect(yacht).toMatchObject({ lat: expected.lat, lng: expected.lng, isMoving: expected.isMoving });
  });

  it('draws the sailed part of the voyage and the rest to its destination', () => {
    const [yacht] = resolve([position({
      vehicleId: 10, type: 'yacht', trackingMode: 'simulated', source: 'sim',
    })]);
    const voyage = simVoyageAt(10, NOW);
    const from = MARINAS.find((m) => m.name === voyage.from)!;
    const to = MARINAS.find((m) => m.name === voyage.to)!;
    expect(yacht!.status).toBe('moving');
    expect(yacht!.trail?.[0]).toMatchObject({ lat: from.lat, lng: from.lng });
    expect(yacht!.trail?.at(-1)).toMatchObject({ lat: yacht!.lat, lng: yacht!.lng });
    expect(yacht!.plan?.[0]).toMatchObject({ lat: yacht!.lat, lng: yacht!.lng });
    expect(yacht!.plan?.at(-1)).toMatchObject({ lat: to.lat, lng: to.lng });
    expect(yacht!.destination).toBe(voyage.to);
  });

  it('parks a simulated jet without a trail', () => {
    const [jet] = resolve([position({ vehicleId: 54, trackingMode: 'simulated', source: 'sim' })]);
    expect(jet!.status).toBe('parked');
    expect(jet!.trail).toBeNull();
    expect(jet!.plan).toBeNull();
  });
});

describe('focusedVehicle', () => {
  const fleet = resolve([
    position({ vehicleId: 1, personId: 7 }),
    position({ vehicleId: 2, personId: 7, isMoving: true }),
    position({ vehicleId: 3, personId: 8 }),
  ], [trip({ vehicleId: 2 })]);

  it('focuses the explicitly picked vehicle', () => {
    expect(focusedVehicle(fleet, 7, 1)?.vehicleId).toBe(1);
  });
  it('prefers a person’s moving vehicle when none was picked', () => {
    expect(focusedVehicle(fleet, 7, null)?.vehicleId).toBe(2);
  });
  it('falls back to the person’s first vehicle', () => {
    expect(focusedVehicle(fleet, 8, null)?.vehicleId).toBe(3);
  });
  it('focuses nothing without a selection', () => {
    expect(focusedVehicle(fleet, null, null)).toBeUndefined();
  });
});

describe('resolveFleet — location', () => {
  it('names the airport a simulated jet is parked at, since the week began', () => {
    const [jet] = resolve([position({ vehicleId: 54, trackingMode: 'simulated', source: 'sim' })]);
    const stay = simulatedStay({ id: 54, type: 'jet' }, NOW);
    expect(jet!.location).toEqual({ name: stay.place, at: stay.since, kind: 'since' });
  });
  it('labels a live fix with the nearest known place and when it was taken', () => {
    const recordedAt = new Date(NOW.getTime() - 20 * 60_000);
    const [jet] = resolve([position({ lat: 34.2, lng: -118.49, recordedAt })]);
    expect(jet!.location).toEqual({ name: 'near Van Nuys', at: recordedAt, kind: 'fix' });
  });
  it('falls back to coordinates far from any known place', () => {
    const [jet] = resolve([position({ lat: 27.16, lng: -34.5 })]);
    expect(jet!.location.name).toBe('27.16° N, 34.50° W');
  });
});
