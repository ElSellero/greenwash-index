import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from './client';
import { events, persons, positions, scoreSnapshots, trips, vehicles } from './schema';

/** Latest snapshot per person joined with person — the leaderboard. */
export const getLeaderboard = async () => {
  const latest = db.$with('latest').as(
    db.select({
      personId: scoreSnapshots.personId,
      maxDate: sql<string>`max(${scoreSnapshots.snapshotDate})`.as('max_date'),
    }).from(scoreSnapshots).groupBy(scoreSnapshots.personId),
  );
  return db.with(latest)
    .select({
      personId: persons.id,
      slug: persons.slug,
      name: persons.name,
      category: persons.category,
      imageUrl: persons.imageUrl,
      co2Kg12m: scoreSnapshots.co2Kg12m,
      co2KgTotal: scoreSnapshots.co2KgTotal,
      multiplier: scoreSnapshots.multiplier,
      score: scoreSnapshots.score,
      rank: scoreSnapshots.rank,
      co2RatePerSec: scoreSnapshots.co2RatePerSec,
      snapshotDate: scoreSnapshots.snapshotDate,
    })
    .from(scoreSnapshots)
    .innerJoin(latest, and(
      eq(latest.personId, scoreSnapshots.personId),
      eq(latest.maxDate, scoreSnapshots.snapshotDate),
    ))
    .innerJoin(persons, eq(persons.id, scoreSnapshots.personId))
    .orderBy(scoreSnapshots.rank);
};

export const getPersonDetail = async (slug: string) => {
  const person = await db.query.persons.findFirst({ where: eq(persons.slug, slug) });
  if (!person) return null;
  const [personVehicles, personEvents, snapshot] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.personId, person.id)),
    db.select().from(events)
      .where(eq(events.personId, person.id))
      .orderBy(desc(events.occurredAt)),
    db.select().from(scoreSnapshots)
      .where(eq(scoreSnapshots.personId, person.id))
      .orderBy(desc(scoreSnapshots.snapshotDate)).limit(1),
  ]);
  return { person, vehicles: personVehicles, events: personEvents, snapshot: snapshot[0] ?? null };
};

/** Latest position per vehicle + active trip, for the globe. */
export const getCurrentPositions = async () => {
  const latestPos = db.$with('latest_pos').as(
    db.select({
      vehicleId: positions.vehicleId,
      maxAt: sql<string>`max(${positions.recordedAt})`.as('max_at'),
    }).from(positions).groupBy(positions.vehicleId),
  );
  const rows = await db.with(latestPos)
    .select({
      vehicleId: vehicles.id,
      personId: vehicles.personId,
      type: vehicles.type,
      vehicleName: vehicles.name,
      trackingMode: vehicles.trackingMode,
      lat: positions.lat,
      lng: positions.lng,
      isMoving: positions.isMoving,
      source: positions.source,
      recordedAt: positions.recordedAt,
    })
    .from(positions)
    .innerJoin(latestPos, and(
      eq(latestPos.vehicleId, positions.vehicleId),
      eq(latestPos.maxAt, positions.recordedAt),
    ))
    .innerJoin(vehicles, eq(vehicles.id, positions.vehicleId));
  const activeTrips = await db.select().from(trips).where(eq(trips.status, 'active'));
  return { positions: rows, activeTrips };
};

export const getRecentEvents = async (limit = 20) =>
  db.select({
    id: events.id,
    personId: events.personId,
    name: persons.name,
    slug: persons.slug,
    kind: events.kind,
    type: events.type,
    title: events.title,
    occurredAt: events.occurredAt,
    sourceUrl: events.sourceUrl,
    autoClassified: events.autoClassified,
  })
    .from(events)
    .innerJoin(persons, eq(persons.id, events.personId))
    .orderBy(desc(events.createdAt))
    .limit(limit);

export const getTopNPersonIds = async (n: number): Promise<number[]> => {
  const board = await getLeaderboard();
  return board.slice(0, n).map((r) => r.personId);
};

export const getVehiclesForPersons = async (personIds: number[]) =>
  personIds.length === 0
    ? []
    : db.select().from(vehicles).where(inArray(vehicles.personId, personIds));

export const getEventsSince = async (personId: number, since: Date) =>
  db.select().from(events).where(and(
    eq(events.personId, personId),
    gte(events.occurredAt, since),
  ));
