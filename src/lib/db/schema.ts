import {
  pgTable, serial, text, integer, real, timestamp, boolean, date, index,
} from 'drizzle-orm/pg-core';

export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'tech' | 'music' | 'film' | 'sports' | 'business' | 'royalty'
  bio: text('bio').notNull().default(''),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id),
  type: text('type').notNull(), // 'jet' | 'yacht'
  name: text('name').notNull(), // "Gulfstream G650ER" / "M/Y Koru"
  registration: text('registration'), // tail number or vessel name
  icao24: text('icao24'), // lowercase hex, jets only
  mmsi: text('mmsi'), // AIS Maritime Mobile Service Identity, yachts only
  modelKey: text('model_key'), // key into JET_MODEL_KG_PER_KM
  co2KgPerKm: real('co2_kg_per_km').notNull(),
  trackingMode: text('tracking_mode').notNull(), // 'live' | 'simulated'
  verified: boolean('verified').notNull().default(false), // research script sets true w/ source
  verificationUrl: text('verification_url'),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id),
  kind: text('kind').notNull(), // 'positive' | 'negative'
  type: text('type').notNull(), // positive: post|donation|investment|interview|speech|preaching ; negative: flight|yacht_trip|asset
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  sourceUrl: text('source_url').notNull(), // HARD REQUIREMENT (legal) — primary source
  extraSources: text('extra_sources').array(), // additional outlets corroborating the same act
  occurredAt: timestamp('occurred_at').notNull(),
  co2Kg: real('co2_kg'), // negative events only
  advocacyWeight: integer('advocacy_weight'), // positive events only, 1–5
  weightFactor: real('weight_factor').notNull().default(1), // <1 = echo/repeat of a prior act
  confidence: real('confidence'), // LLM confidence, null = human-entered
  autoClassified: boolean('auto_classified').notNull().default(false),
  classifier: text('classifier'), // which model classified it (e.g. 'gemini-3.5-flash', 'ollama:gemma4'); 'ollama:*' = pending re-verification by Gemini
  reviewed: boolean('reviewed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('events_person_kind_idx').on(t.personId, t.kind),
  index('events_occurred_idx').on(t.occurredAt),
]);

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  altitudeM: real('altitude_m'),
  heading: real('heading'),
  isMoving: boolean('is_moving').notNull(),
  source: text('source').notNull(), // 'adsb' | 'sim'
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
}, (t) => [index('positions_vehicle_time_idx').on(t.vehicleId, t.recordedAt)]);

export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  status: text('status').notNull(), // 'active' | 'completed'
  startLat: real('start_lat').notNull(),
  startLng: real('start_lng').notNull(),
  lastLat: real('last_lat').notNull(),
  lastLng: real('last_lng').notNull(),
  distanceKm: real('distance_km').notNull().default(0),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
}, (t) => [index('trips_vehicle_status_idx').on(t.vehicleId, t.status)]);

export const scoreSnapshots = pgTable('score_snapshots', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id),
  snapshotDate: date('snapshot_date').notNull(),
  co2Kg12m: real('co2_kg_12m').notNull(),
  co2KgTotal: real('co2_kg_total').notNull(),
  multiplier: real('multiplier').notNull(),
  score: real('score').notNull(),
  rank: integer('rank').notNull(),
  co2RatePerSec: real('co2_rate_per_sec').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('snapshots_person_date_idx').on(t.personId, t.snapshotDate)]);

export const seenArticles = pgTable('seen_articles', {
  id: serial('id').primaryKey(),
  urlHash: text('url_hash').notNull().unique(), // sha256 of canonical URL — ingest dedupe
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
