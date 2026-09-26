import { bearingDeg, pathLengthKm, pointAlongPath, type LatLng } from '@/lib/geo';
import { seaRoute } from '@/lib/sea/route';

type Marina = { name: string; lat: number; lng: number; airport: LatLng; airportName: string };

/** Order is part of the simulation: the seeded PRNG picks marinas by index. */
export const MARINAS: Marina[] = [
  { name: 'Monaco', lat: 43.735, lng: 7.421, airport: { lat: 43.658, lng: 7.215 }, airportName: 'Nice Côte d’Azur Airport' },
  { name: 'Porto Cervo', lat: 41.136, lng: 9.535, airport: { lat: 40.899, lng: 9.518 }, airportName: 'Olbia Costa Smeralda Airport' },
  { name: 'Ibiza', lat: 38.910, lng: 1.435, airport: { lat: 38.873, lng: 1.373 }, airportName: 'Ibiza Airport' },
  { name: 'St. Tropez', lat: 43.272, lng: 6.640, airport: { lat: 43.206, lng: 6.482 }, airportName: 'La Môle–Saint-Tropez Airport' },
  { name: 'Mykonos', lat: 37.451, lng: 25.330, airport: { lat: 37.435, lng: 25.348 }, airportName: 'Mykonos Airport' },
  { name: 'Dubrovnik', lat: 42.640, lng: 18.108, airport: { lat: 42.561, lng: 18.268 }, airportName: 'Dubrovnik Airport' },
  { name: 'St. Barts', lat: 17.897, lng: -62.850, airport: { lat: 17.904, lng: -62.844 }, airportName: 'St. Barthélemy Airport' },
  { name: 'Nassau', lat: 25.078, lng: -77.338, airport: { lat: 25.039, lng: -77.466 }, airportName: 'Nassau Lynden Pindling Airport' },
  { name: 'Miami', lat: 25.772, lng: -80.190, airport: { lat: 25.907, lng: -80.278 }, airportName: 'Miami-Opa Locka Executive Airport' },
  { name: 'Antigua', lat: 17.117, lng: -61.845, airport: { lat: 17.137, lng: -61.793 }, airportName: 'Antigua V. C. Bird Airport' },
  { name: 'Dubai Marina', lat: 25.076, lng: 55.133, airport: { lat: 24.896, lng: 55.161 }, airportName: 'Dubai World Central Airport' },
  { name: 'Auckland', lat: -36.843, lng: 174.766, airport: { lat: -37.008, lng: 174.792 }, airportName: 'Auckland Airport' },
  { name: 'Palma de Mallorca', lat: 39.567, lng: 2.633, airport: { lat: 39.552, lng: 2.739 }, airportName: 'Palma de Mallorca Airport' },
  { name: 'Cannes', lat: 43.549, lng: 7.017, airport: { lat: 43.542, lng: 6.953 }, airportName: 'Cannes-Mandelieu Airport' },
];

/** mulberry32 — tiny seeded PRNG, good enough for satire. */
const prng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type SimPosition = {
  lat: number; lng: number; heading: number; isMoving: boolean;
  from: string; to: string;
};

export type SimVoyage = {
  from: string; to: string;
  /** Sea route from the origin marina to the destination marina. */
  route: LatLng[];
  totalKm: number;
  progressKm: number;
  isMoving: boolean;
};

const WEEK_MS = 7 * 24 * 3600_000;
/** Fraction of each week spent sailing (rest = moored). */
const SAIL_FRACTION = 0.35;
const PARKED_JET_SEED_OFFSET = 100_000;

const weeklyMarinas = (seed: number, at: Date) => {
  const week = Math.floor(at.getTime() / WEEK_MS);
  const rand = prng(seed * 7919 + week);
  const fromIdx = Math.floor(rand() * MARINAS.length);
  let toIdx = Math.floor(rand() * MARINAS.length);
  if (toIdx === fromIdx) toIdx = (toIdx + 1) % MARINAS.length;
  return { from: MARINAS[fromIdx]!, to: MARINAS[toIdx]! };
};

/** This week's simulated voyage for a vehicle: sailing early in the week, moored after. */
export const simVoyageAt = (vehicleId: number, at: Date): SimVoyage => {
  const { from, to } = weeklyMarinas(vehicleId, at);
  const route = seaRoute(from, to);
  const totalKm = pathLengthKm(route);
  const weekProgress = (at.getTime() % WEEK_MS) / WEEK_MS;
  const isMoving = weekProgress < SAIL_FRACTION;
  const progressKm = isMoving ? totalKm * (weekProgress / SAIL_FRACTION) : totalKm;
  return { from: from.name, to: to.name, route, totalKm, progressKm, isMoving };
};

export const yachtPositionAt = (vehicleId: number, at: Date): SimPosition => {
  const v = simVoyageAt(vehicleId, at);
  const p = pointAlongPath(v.route, v.progressKm);
  return { lat: p.lat, lng: p.lng, heading: p.heading, isMoving: v.isMoving, from: v.from, to: v.to };
};

/** Unverified jets never fly in the simulation — they sit at an airport near a marina. */
const parkedJetAt = (vehicleId: number, at: Date): SimPosition => {
  const { from, to } = weeklyMarinas(vehicleId + PARKED_JET_SEED_OFFSET, at);
  return {
    lat: to.airport.lat, lng: to.airport.lng,
    heading: bearingDeg(from, to), isMoving: false,
    from: to.name, to: to.name,
  };
};

const weekStart = (at: Date) => new Date(Math.floor(at.getTime() / WEEK_MS) * WEEK_MS);

/** Where a simulated vehicle is and since when: the airport or marina, or at sea since departure. */
export const simulatedStay = (vehicle: { id: number; type: string }, at: Date): { place: string; since: Date } => {
  const start = weekStart(at);
  if (vehicle.type !== 'yacht') {
    const { to } = weeklyMarinas(vehicle.id + PARKED_JET_SEED_OFFSET, at);
    return { place: to.airportName, since: start };
  }
  const v = simVoyageAt(vehicle.id, at);
  return v.isMoving
    ? { place: `At sea · ${v.from} → ${v.to}`, since: start }
    : { place: v.to, since: new Date(start.getTime() + SAIL_FRACTION * WEEK_MS) };
};

/** Position of a simulated vehicle at `at`: yachts sail sea routes, jets stay parked. */
export const simulatedPosition = (vehicle: { id: number; type: string }, at: Date): SimPosition =>
  vehicle.type === 'yacht' ? yachtPositionAt(vehicle.id, at) : parkedJetAt(vehicle.id, at);
