import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ inserts: [] as { table: unknown; value: unknown }[] }));
vi.mock('@/lib/db/client', () => ({ db: {
  insert: (table: unknown) => ({ values: async (value: unknown) => { state.inserts.push({ table, value }); } }),
  update: () => ({ set: () => ({ where: async () => {} }) }),
  select: () => ({ from: () => ({ where: () => ({ limit: async () => [{
    id: 1, startLat: 0, startLng: 0, lastLat: 0, lastLng: 0, distanceKm: 100, startedAt: new Date(),
  }] }) }) }),
} }));
import { recordObservation } from './pipeline';
import { events, vehicles, positions } from '@/lib/db/schema';
const vehicle: typeof vehicles.$inferSelect = { id: 1, personId: 1, name: 'Yacht', type: 'yacht',
  co2KgPerKm: 10, trackingMode: 'simulated', registration: null, icao24: null, mmsi: '123',
  modelKey: null, verified: false, verificationUrl: null };
const observation = { lat: 0, lng: 0, isMoving: false, heading: null, altitudeM: null };
beforeEach(() => { state.inserts.length = 0; });
it('keeps simulated positions without generating factual events or CO2 claims', async () => {
  await recordObservation(vehicle, observation, 'sim', new Date());
  expect(state.inserts.map(x => x.table)).toEqual([positions]);
});
it('still creates an event for a completed publicly tracked voyage', async () => {
  await recordObservation(vehicle, observation, 'ais', new Date());
  expect(state.inserts.find(x => x.table === events)?.value).toMatchObject({ co2Kg: 1000, type: 'yacht_trip' });
});
