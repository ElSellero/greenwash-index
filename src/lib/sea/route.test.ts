import { describe, expect, it } from 'vitest';
import { densifyPath, haversineKm, pathLengthKm, type LatLng } from '@/lib/geo';
import { MARINAS } from '@/lib/ingest/yachtSim';
import { SEA_LANES, SEA_NODES } from '@/lib/sea/lanes';
import { seaRoute } from '@/lib/sea/route';
import { isWater } from './__fixtures__/waterMask';

/*
 * The mask resolves ~20 km, so the canals and the upper Gulf of Suez are narrower than it
 * can show and are exempt, as is the harbour approach at each end of a route.
 */
const CANALS = [
  { name: 'Suez canal and upper Gulf of Suez', lat: [29.0, 31.4], lng: [32.1, 32.9] },
  { name: 'Panama', lat: [8.7, 9.6], lng: [-80.1, -79.3] },
] as const;
const inCanal = ({ lat, lng }: LatLng) => CANALS.some((c) =>
  lat >= c.lat[0] && lat <= c.lat[1] && lng >= c.lng[0] && lng <= c.lng[1]);

const HARBOUR_KM = 25;
const km = (a: LatLng, b: LatLng) => haversineKm(a.lat, a.lng, b.lat, b.lng);

const landHits = (route: LatLng[]) => {
  const start = route[0]!, end = route.at(-1)!;
  return densifyPath(route, 0.05).filter((p) =>
    !isWater(p) && !inCanal(p) && km(p, start) > HARBOUR_KM && km(p, end) > HARBOUR_KM);
};

const node = (id: keyof typeof SEA_NODES): LatLng => ({ lat: SEA_NODES[id][0], lng: SEA_NODES[id][1] });

describe('sea lanes', () => {
  it('every lane stays on open water', () => {
    const crossings = SEA_LANES
      .map(([a, b]) => ({ lane: `${a}→${b}`, hits: landHits([node(a), node(b)]).length }))
      .filter((l) => l.hits > 0);
    expect(crossings).toEqual([]);
  });

  it('every waypoint lies in water', () => {
    const dry = Object.keys(SEA_NODES).filter((id) => {
      const p = node(id as keyof typeof SEA_NODES);
      return !isWater(p) && !inCanal(p);
    });
    expect(dry).toEqual([]);
  });
});

describe('seaRoute', () => {
  const pairs = MARINAS.flatMap((a) => MARINAS.filter((b) => b !== a).map((b) => [a, b] as const));

  it('keeps every marina-to-marina voyage off land', () => {
    const crossings = pairs
      .map(([a, b]) => ({ voyage: `${a.name}→${b.name}`, hits: landHits(seaRoute(a, b)).length }))
      .filter((v) => v.hits > 0);
    expect(crossings).toEqual([]);
  });

  it('begins and ends at the requested points', () => {
    const [a, b] = pairs[0]!;
    const route = seaRoute(a, b);
    expect(route[0]).toMatchObject({ lat: a.lat, lng: a.lng });
    expect(route.at(-1)).toMatchObject({ lat: b.lat, lng: b.lng });
  });

  it('is equally long in both directions', () => {
    for (const [a, b] of pairs) {
      expect(pathLengthKm(seaRoute(a, b))).toBeCloseTo(pathLengthKm(seaRoute(b, a)), 3);
    }
  });

  it('goes direct for a short hop', () => {
    const a = { lat: 43.7, lng: 7.5 }, b = { lat: 43.65, lng: 7.6 };
    expect(seaRoute(a, b)).toEqual([a, b]);
  });

  it('takes the Suez canal from the Riviera to Dubai instead of rounding Africa', () => {
    const monaco = MARINAS.find((m) => m.name === 'Monaco')!;
    const dubai = MARINAS.find((m) => m.name === 'Dubai Marina')!;
    expect(pathLengthKm(seaRoute(monaco, dubai))).toBeLessThan(10_000);
  });

  it('sails around the boot of Italy from Dubrovnik to Monaco', () => {
    const dubrovnik = MARINAS.find((m) => m.name === 'Dubrovnik')!;
    const monaco = MARINAS.find((m) => m.name === 'Monaco')!;
    const southmost = Math.min(...seaRoute(dubrovnik, monaco).map((p) => p.lat));
    expect(southmost).toBeLessThan(38.5);
  });
});
