export const MARINAS: { name: string; lat: number; lng: number }[] = [
  { name: 'Monaco', lat: 43.735, lng: 7.421 },
  { name: 'Porto Cervo', lat: 41.136, lng: 9.535 },
  { name: 'Ibiza', lat: 38.910, lng: 1.435 },
  { name: 'St. Tropez', lat: 43.272, lng: 6.640 },
  { name: 'Mykonos', lat: 37.451, lng: 25.330 },
  { name: 'Dubrovnik', lat: 42.640, lng: 18.108 },
  { name: 'St. Barts', lat: 17.897, lng: -62.850 },
  { name: 'Nassau', lat: 25.078, lng: -77.338 },
  { name: 'Miami', lat: 25.772, lng: -80.190 },
  { name: 'Antigua', lat: 17.117, lng: -61.845 },
  { name: 'Dubai Marina', lat: 25.076, lng: 55.133 },
  { name: 'Auckland', lat: -36.843, lng: 174.766 },
  { name: 'Palma de Mallorca', lat: 39.567, lng: 2.633 },
  { name: 'Cannes', lat: 43.549, lng: 7.017 },
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

const WEEK_MS = 7 * 24 * 3600_000;
/** Fraction of each week spent sailing (rest = moored). */
const SAIL_FRACTION = 0.35;

export const yachtPositionAt = (vehicleId: number, at: Date): SimPosition => {
  const week = Math.floor(at.getTime() / WEEK_MS);
  const rand = prng(vehicleId * 7919 + week);
  const fromIdx = Math.floor(rand() * MARINAS.length);
  let toIdx = Math.floor(rand() * MARINAS.length);
  if (toIdx === fromIdx) toIdx = (toIdx + 1) % MARINAS.length;
  const from = MARINAS[fromIdx]!;
  const to = MARINAS[toIdx]!;

  const weekProgress = (at.getTime() % WEEK_MS) / WEEK_MS;
  const isMoving = weekProgress < SAIL_FRACTION;
  const t = isMoving ? weekProgress / SAIL_FRACTION : 1;
  const lat = from.lat + (to.lat - from.lat) * t;
  const lng = from.lng + (to.lng - from.lng) * t;
  const heading = (Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI;
  return { lat, lng, heading: (heading + 360) % 360, isMoving, from: from.name, to: to.name };
};
