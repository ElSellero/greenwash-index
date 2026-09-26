import type { PositionsPayload } from '@/lib/api-types';
import { pointAlongPath, type LatLng } from '@/lib/geo';
import { simulatedPosition, simulatedStay, simVoyageAt } from '@/lib/ingest/yachtSim';
import { formatCoords, nearestPlace } from './places';
import { seaRoute } from '@/lib/sea/route';

type Position = PositionsPayload['positions'][number];
type Trip = PositionsPayload['activeTrips'][number];

export type VehicleStatus = 'moving' | 'parked' | 'stale';

/** Where the vehicle is: `since` it arrived (simulated), or where its last `fix` was taken (live). */
export type VehicleLocation = { name: string; at: Date; kind: 'since' | 'fix' };

export type GlobeVehicle = Position & {
  status: VehicleStatus;
  /** Path covered on the current trip, ending at the vehicle. */
  trail: LatLng[] | null;
  /** Rest of a simulated voyage, from the vehicle to its destination marina. */
  plan: LatLng[] | null;
  destination: string | null;
  location: VehicleLocation;
};

const HOUR = 3_600_000;
const MOVING_STALE_MS: Record<string, number> = { jet: 3 * HOUR, yacht: 12 * HOUR };
const PARKED_STALE_MS = 30 * 24 * HOUR;

const resolveSimulated = (pos: Position, now: Date): GlobeVehicle => {
  const vehicle = { id: pos.vehicleId, type: pos.type };
  const sim = simulatedPosition(vehicle, now);
  const stay = simulatedStay(vehicle, now);
  const base = {
    ...pos, lat: sim.lat, lng: sim.lng, heading: sim.heading, isMoving: sim.isMoving,
    location: { name: stay.place, at: stay.since, kind: 'since' as const },
  };
  if (pos.type !== 'yacht' || !sim.isMoving) {
    return { ...base, status: 'parked', trail: null, plan: null, destination: null };
  }
  const voyage = simVoyageAt(pos.vehicleId, now);
  const split = pointAlongPath(voyage.route, voyage.progressKm);
  return { ...base, status: 'moving', trail: split.traveled, plan: split.remaining, destination: voyage.to };
};

const liveTrail = (pos: Position, trip: Trip | undefined): LatLng[] | null => {
  if (!trip) return null;
  const start = { lat: trip.startLat, lng: trip.startLng };
  const here = { lat: pos.lat, lng: pos.lng };
  return pos.type === 'yacht' ? seaRoute(start, here) : [start, here];
};

const liveLocation = (pos: Position): VehicleLocation => {
  const near = nearestPlace(pos.lat, pos.lng);
  return { name: near ? `near ${near}` : formatCoords(pos.lat, pos.lng), at: new Date(pos.recordedAt), kind: 'fix' };
};

const resolveLive = (pos: Position, trip: Trip | undefined, now: Date): GlobeVehicle => {
  const ageMs = now.getTime() - new Date(pos.recordedAt).getTime();
  const staleAfter = pos.isMoving ? MOVING_STALE_MS[pos.type] ?? 3 * HOUR : PARKED_STALE_MS;
  const base = { ...pos, plan: null, destination: null, location: liveLocation(pos) };
  if (ageMs > staleAfter) return { ...base, isMoving: false, status: 'stale', trail: null };
  if (!pos.isMoving) return { ...base, status: 'parked', trail: null };
  return { ...base, status: 'moving', trail: liveTrail(pos, trip) };
};

/**
 * What the globe shows for each vehicle right now: simulated vehicles are re-simulated
 * for `now`, live ones fall back to "signal lost" once their last fix is too old to trust.
 */
export const resolveFleet = (payload: PositionsPayload, now: Date): GlobeVehicle[] => {
  const trips = new Map(payload.activeTrips.map((t) => [t.vehicleId, t]));
  return payload.positions.map((pos) => pos.trackingMode === 'simulated'
    ? resolveSimulated(pos, now)
    : resolveLive(pos, trips.get(pos.vehicleId), now));
};

/** The vehicle the globe and popup focus on: the one picked, else the person's moving (or first) vehicle. */
export const focusedVehicle = (
  vehicles: GlobeVehicle[], personId: number | null, vehicleId: number | null,
): GlobeVehicle | undefined => {
  const picked = vehicleId === null ? undefined : vehicles.find((v) => v.vehicleId === vehicleId);
  if (picked || personId === null) return picked;
  const own = vehicles.filter((v) => v.personId === personId);
  return own.find((v) => v.status === 'moving') ?? own[0];
};
