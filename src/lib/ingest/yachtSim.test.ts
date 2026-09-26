import { describe, expect, it } from 'vitest';
import { haversineKm, pointAlongPath } from '@/lib/geo';
import { MARINAS, simulatedPosition, simulatedStay, simVoyageAt, yachtPositionAt } from '@/lib/ingest/yachtSim';
import { isWater } from '@/lib/sea/__fixtures__/waterMask';

const T = new Date('2026-06-10T12:00:00Z');
const HOUR = 3600_000;
const samples = (hours: number, stepH: number) =>
  Array.from({ length: Math.floor(hours / stepH) }, (_, i) => new Date(T.getTime() + i * stepH * HOUR));

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
    const states = samples(7 * 24, 12).map((at) => yachtPositionAt(7, at).isMoving);
    expect(new Set(states).size).toBe(2);
  });
  it('stays on the water for a year of voyages', () => {
    const dry = [4, 10, 13, 19, 24, 40, 42, 51, 55, 60].flatMap((id) =>
      samples(365 * 24, 7).map((at) => yachtPositionAt(id, at))
        .filter((p) => !isWater(p))
        .filter((p) => MARINAS.every((m) => haversineKm(p.lat, p.lng, m.lat, m.lng) > 25))
        .filter((p) => !(p.lat > 29 && p.lat < 31.4 && p.lng > 32.1 && p.lng < 32.9))
        .filter((p) => !(p.lat > 8.7 && p.lat < 9.6 && p.lng > -80.1 && p.lng < -79.3))
        .map((p) => `${id}: ${p.lat.toFixed(2)},${p.lng.toFixed(2)} ${p.from}→${p.to}`));
    expect(dry).toEqual([]);
  });
  it('moors at its destination marina once the voyage is over', () => {
    const moored = samples(14 * 24, 6).map((at) => yachtPositionAt(7, at)).find((p) => !p.isMoving)!;
    const dest = MARINAS.find((m) => m.name === moored.to)!;
    expect(moored).toMatchObject({ lat: dest.lat, lng: dest.lng });
  });
});

describe('simVoyageAt', () => {
  it('sails from one marina to another along its route', () => {
    const v = simVoyageAt(7, T);
    const from = MARINAS.find((m) => m.name === v.from)!;
    const to = MARINAS.find((m) => m.name === v.to)!;
    expect(v.route[0]).toMatchObject({ lat: from.lat, lng: from.lng });
    expect(v.route.at(-1)).toMatchObject({ lat: to.lat, lng: to.lng });
    expect(v.progressKm).toBeGreaterThanOrEqual(0);
    expect(v.progressKm).toBeLessThanOrEqual(v.totalKm);
  });
  it('places the yacht at its progress along the route', () => {
    for (const at of samples(7 * 24, 5)) {
      const v = simVoyageAt(13, at);
      const p = yachtPositionAt(13, at);
      const expected = pointAlongPath(v.route, v.progressKm);
      expect(p.lat).toBeCloseTo(expected.lat, 9);
      expect(p.lng).toBeCloseTo(expected.lng, 9);
    }
  });
});

describe('simulatedPosition', () => {
  const airports = MARINAS.map((m) => m.airport);

  it('keeps simulated jets parked at an airport', () => {
    for (const at of samples(21 * 24, 5)) {
      const p = simulatedPosition({ id: 54, type: 'jet' }, at);
      expect(p.isMoving).toBe(false);
      expect(airports).toContainEqual({ lat: p.lat, lng: p.lng });
    }
  });
  it('sails simulated yachts', () => {
    expect(simulatedPosition({ id: 7, type: 'yacht' }, T)).toEqual(yachtPositionAt(7, T));
  });
});

describe('MARINAS', () => {
  it('ships at least 12 destinations', () => {
    expect(MARINAS.length).toBeGreaterThanOrEqual(12);
  });
  it('pairs every marina with a nearby airport', () => {
    for (const m of MARINAS) {
      expect(haversineKm(m.lat, m.lng, m.airport.lat, m.airport.lng)).toBeLessThan(60);
    }
  });
});

describe('simulatedStay', () => {
  const WEEK = 7 * 24 * HOUR;
  const weekStart = (at: Date) => new Date(Math.floor(at.getTime() / WEEK) * WEEK);

  it('names the airport a simulated jet is parked at, since the week began', () => {
    const at = new Date('2026-09-26T20:00:00Z');
    const p = simulatedPosition({ id: 54, type: 'jet' }, at);
    const stay = simulatedStay({ id: 54, type: 'jet' }, at);
    const marina = MARINAS.find((m) => m.airport.lat === p.lat && m.airport.lng === p.lng)!;
    expect(stay).toEqual({ place: marina.airportName, since: weekStart(at) });
  });

  it('names the marina a moored yacht arrived at, since its arrival', () => {
    const at = new Date('2026-09-26T20:00:00Z');
    const p = yachtPositionAt(10, at);
    const stay = simulatedStay({ id: 10, type: 'yacht' }, at);
    expect(p.isMoving).toBe(false);
    expect(stay.place).toBe(p.to);
    expect(stay.since.getTime()).toBe(weekStart(at).getTime() + 0.35 * WEEK);
  });

  it('describes a sailing yacht as at sea between its marinas, since departure', () => {
    const at = new Date('2026-09-24T20:00:00Z');
    const p = yachtPositionAt(10, at);
    expect(p.isMoving).toBe(true);
    expect(simulatedStay({ id: 10, type: 'yacht' }, at)).toEqual({
      place: `At sea · ${p.from} → ${p.to}`, since: weekStart(at),
    });
  });
});
