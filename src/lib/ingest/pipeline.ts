import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { events, positions, scoreSnapshots, trips, vehicles, persons } from '@/lib/db/schema';
import { getTopNPersonIds, getVehiclesForPersons } from '@/lib/db/queries';
import { fetchJetStates } from './adsb';
import { nextTripState, type TripState } from './trips';
import { yachtPositionAt } from './yachtSim';
import { tripCo2Kg, co2RatePerSecond } from '@/lib/score/co2';
import { advocacyMultiplier, hypocrisyScore, rankPersons, stanceScore, type StanceEvent } from '@/lib/score/hypocrisy';
import { CONFIG } from '@/config';

type VehicleRow = typeof vehicles.$inferSelect;

export const recordObservation = async (
  vehicle: VehicleRow,
  obs: { lat: number; lng: number; isMoving: boolean; heading: number | null; altitudeM: number | null },
  source: 'adsb' | 'sim' | 'ais',
  now: Date,
) => {
  await db.insert(positions).values({
    vehicleId: vehicle.id, lat: obs.lat, lng: obs.lng,
    altitudeM: obs.altitudeM, heading: obs.heading,
    isMoving: obs.isMoving, source, recordedAt: now,
  });

  const [activeRow] = await db.select().from(trips)
    .where(and(eq(trips.vehicleId, vehicle.id), eq(trips.status, 'active'))).limit(1);
  const active: TripState | null = activeRow
    ? { startLat: activeRow.startLat, startLng: activeRow.startLng,
        lastLat: activeRow.lastLat, lastLng: activeRow.lastLng,
        distanceKm: activeRow.distanceKm, startedAt: activeRow.startedAt }
    : null;

  const transition = nextTripState(active, obs, now);
  if (transition.action === 'open') {
    await db.insert(trips).values({
      vehicleId: vehicle.id, status: 'active',
      startLat: transition.startLat, startLng: transition.startLng,
      lastLat: transition.startLat, lastLng: transition.startLng,
      startedAt: transition.startedAt,
    });
  } else if (transition.action === 'extend' && activeRow) {
    await db.update(trips).set({
      lastLat: transition.lastLat, lastLng: transition.lastLng, distanceKm: transition.distanceKm,
    }).where(eq(trips.id, activeRow.id));
  } else if (transition.action === 'close' && activeRow) {
    const co2Kg = tripCo2Kg(transition.totalKm, vehicle.co2KgPerKm);
    await db.update(trips).set({
      status: 'completed', endedAt: transition.endedAt,
      lastLat: transition.endLat, lastLng: transition.endLng, distanceKm: transition.totalKm,
    }).where(eq(trips.id, activeRow.id));
    if (transition.totalKm >= 50) { // ignore repositioning hops
      const isJet = vehicle.type === 'jet';
      await db.insert(events).values({
        personId: vehicle.personId,
        kind: 'negative',
        type: isJet ? 'flight' : 'yacht_trip',
        title: `${isJet ? 'Flight' : 'Yacht trip'} — ${Math.round(transition.totalKm)} km (${vehicle.name})`,
        description: source === 'sim'
          ? 'Simulated voyage (estimated, see methodology).'
          : source === 'ais'
            ? 'Tracked via public AIS data.'
            : 'Tracked via public ADS-B data.',
        sourceUrl: source === 'adsb' && vehicle.icao24
          ? `https://globe.adsb.lol/?icao=${vehicle.icao24}`
          : source === 'ais' && vehicle.mmsi
            ? `https://www.vesselfinder.com/?mmsi=${vehicle.mmsi}`
            : 'https://greenwash-index.example/methodology#simulated',
        occurredAt: now,
        co2Kg,
        autoClassified: true,
      });
    }
  }
};

/**
 * Re-aggregate every person's score snapshot for today from current events.
 * Idempotent: replaces today's rows, so it can run frequently (live tick) without
 * piling up duplicate snapshots. Cheap — pure DB aggregation, no external calls.
 */
export const recomputeScores = async (now = new Date()): Promise<number> => {
  const allPersons = await db.select().from(persons);
  const windowStart = new Date(now.getTime() - CONFIG.co2.windowDays * 86_400_000);
  const dayStart = new Date(now.getTime() - 86_400_000);
  const scored = [] as { personId: number; co2Kg12m: number; co2KgTotal: number; multiplier: number; stanceScore: number; score: number; co2RatePerSec: number }[];
  for (const p of allPersons) {
    // weight the tonnage by weight_factor: neutralized acts (0) drop out, echoes
    // (<1) count proportionally, so down-weighting applies to CO2 just like score.
    const sums = await db.select({
      kg12m: sql<number>`coalesce(sum(${events.co2Kg} * ${events.weightFactor}) filter (where ${events.occurredAt} >= ${windowStart}), 0)`,
      kgTotal: sql<number>`coalesce(sum(${events.co2Kg} * ${events.weightFactor}), 0)`,
      kg24h: sql<number>`coalesce(sum(${events.co2Kg} * ${events.weightFactor}) filter (where ${events.occurredAt} >= ${dayStart}), 0)`,
    }).from(events).where(and(eq(events.personId, p.id), eq(events.kind, 'negative')));
    const advocacy = await db.select({
      weight: events.advocacyWeight, weightFactor: events.weightFactor, occurredAt: events.occurredAt,
    }).from(events).where(and(eq(events.personId, p.id), eq(events.kind, 'positive')));
    // documented "what they do" acts without a CO2 figure (news flights/yachts/assets)
    const negUnquantified = await db.select({ occurredAt: events.occurredAt })
      .from(events)
      .where(and(eq(events.personId, p.id), eq(events.kind, 'negative'), isNull(events.co2Kg),
        gt(events.weightFactor, 0)));

    const m = advocacyMultiplier(
      // echo/repeat events carry weightFactor < 1 so repetition can't inflate the score
      advocacy.map((a) => ({ weight: (a.weight ?? 1) * (a.weightFactor ?? 1), occurredAt: a.occurredAt })), now);
    // rhetoric floor: ONLY documented "what they do" acts without a CO2 figure, amplified
    // by the advocacy multiplier (talk × deeds). Positive advocacy alone never scores — a
    // consistent climate advocate with no documented high-emission act stays at zero.
    const stancePts: StanceEvent[] = negUnquantified.map((e) => ({
      points: CONFIG.score.negStanceUnit, occurredAt: e.occurredAt,
    }));
    const stance = stanceScore(stancePts, m, now);
    const co2Kg12m = sums[0]?.kg12m ?? 0;
    scored.push({
      personId: p.id,
      co2Kg12m,
      co2KgTotal: sums[0]?.kgTotal ?? 0,
      multiplier: m,
      stanceScore: stance,
      score: hypocrisyScore(co2Kg12m / 1000, m) + stance,
      co2RatePerSec: co2RatePerSecond(sums[0]?.kg24h ?? 0),
    });
  }
  const ranked = rankPersons(scored);
  const today = now.toISOString().slice(0, 10);
  // replace today's snapshots so frequent recomputes don't accumulate duplicate rows
  await db.delete(scoreSnapshots).where(eq(scoreSnapshots.snapshotDate, today));
  for (const r of ranked) {
    await db.insert(scoreSnapshots).values({ ...r, snapshotDate: today });
  }
  return ranked.length;
};

/** Live tick: refresh positions for the current top N, then re-aggregate scores. */
export const runLiveIngest = async (now = new Date()) => {
  const topIds = await getTopNPersonIds(CONFIG.live.topN);
  const vehicleRows = await getVehiclesForPersons(topIds);
  const liveJets = vehicleRows.filter((v) => v.trackingMode === 'live' && v.icao24);
  const simulated = vehicleRows.filter((v) => v.trackingMode === 'simulated');

  const states = await fetchJetStates(liveJets.map((v) => v.icao24!));
  for (const jet of liveJets) {
    const s = states.get(jet.icao24!);
    if (!s) continue; // no signal → keep last known position (graceful degradation)
    await recordObservation(jet, { ...s, lng: s.lng, isMoving: s.isAirborne }, 'adsb', now);
  }
  for (const v of simulated) {
    const p = v.type === 'yacht'
      ? yachtPositionAt(v.id, now)
      : { ...yachtPositionAt(v.id + 100_000, now), isMoving: false }; // unverified jets: parked, no fake flights
    await recordObservation(v, { lat: p.lat, lng: p.lng, isMoving: v.type === 'yacht' && p.isMoving, heading: p.heading, altitudeM: null }, 'sim', now);
  }
  // keep the leaderboard fresh between daily runs (reflects the growing backfill)
  const scored = await recomputeScores(now);
  return { liveJets: liveJets.length, simulated: simulated.length, scored };
};

/** Daily run: positions for EVERYONE + recompute all scores. */
export const runDailyPipeline = async (now = new Date()) => {
  const allVehicles = await db.select().from(vehicles);

  // 1) position tick for all vehicles (live jets via ADS-B, rest simulated)
  const liveJets = allVehicles.filter((v) => v.trackingMode === 'live' && v.icao24);
  const states = await fetchJetStates(liveJets.map((v) => v.icao24!));
  for (const jet of liveJets) {
    const s = states.get(jet.icao24!);
    if (s) await recordObservation(jet, { ...s, isMoving: s.isAirborne }, 'adsb', now);
  }
  for (const v of allVehicles.filter((x) => x.trackingMode === 'simulated')) {
    const p = yachtPositionAt(v.id, now);
    await recordObservation(v, { lat: p.lat, lng: p.lng, isMoving: v.type === 'yacht' && p.isMoving, heading: p.heading, altitudeM: null }, 'sim', now);
  }

  // 2) re-aggregate all score snapshots from current events
  return { persons: await recomputeScores(now) };
};
