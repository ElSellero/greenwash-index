import { haversineKm } from '@/lib/geo';

export type TripState = {
  startLat: number; startLng: number;
  lastLat: number; lastLng: number;
  distanceKm: number;
  startedAt: Date;
};

export type Observation = { lat: number; lng: number; isMoving: boolean };

export type TripTransition =
  | { action: 'none' }
  | { action: 'open'; startLat: number; startLng: number; startedAt: Date }
  | { action: 'extend'; lastLat: number; lastLng: number; distanceKm: number }
  | { action: 'close'; endLat: number; endLng: number; totalKm: number; endedAt: Date };

const JITTER_KM = 1;

export const nextTripState = (
  active: TripState | null,
  obs: Observation,
  now: Date,
): TripTransition => {
  if (!active && obs.isMoving)
    return { action: 'open', startLat: obs.lat, startLng: obs.lng, startedAt: now };
  if (!active) return { action: 'none' };

  const legKm = haversineKm(active.lastLat, active.lastLng, obs.lat, obs.lng);
  const grown = legKm >= JITTER_KM ? active.distanceKm + legKm : active.distanceKm;

  if (obs.isMoving)
    return { action: 'extend', lastLat: obs.lat, lastLng: obs.lng, distanceKm: grown };
  return { action: 'close', endLat: obs.lat, endLng: obs.lng, totalKm: grown + (legKm >= JITTER_KM ? 0 : legKm), endedAt: now };
};
