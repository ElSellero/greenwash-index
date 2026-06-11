import { readFileSync } from 'node:fs';
import { db } from '../src/lib/db/client';
import { persons, vehicles } from '../src/lib/db/schema';
import { JET_MODEL_KG_PER_KM } from '../src/lib/score/co2';
import { CONFIG } from '../src/config';

type RosterVehicle = { type: 'jet' | 'yacht'; name: string; modelKey: string | null };
type RosterEntry = { slug: string; name: string; category: string; vehicles: RosterVehicle[] };

const YACHT_DEFAULT_KG_PER_KM = 90; // documented estimate, /methodology

const run = async () => {
  const roster: RosterEntry[] = JSON.parse(readFileSync('data/persons.json', 'utf8'));
  for (const entry of roster) {
    const [person] = await db.insert(persons)
      .values({ slug: entry.slug, name: entry.name, category: entry.category })
      .onConflictDoUpdate({ target: persons.slug, set: { name: entry.name, category: entry.category } })
      .returning();
    if (!person) continue;
    for (const v of entry.vehicles) {
      const co2KgPerKm = v.type === 'yacht'
        ? YACHT_DEFAULT_KG_PER_KM
        : (v.modelKey ? JET_MODEL_KG_PER_KM[v.modelKey] : undefined) ?? CONFIG.co2.jetFallbackKgPerKm;
      await db.insert(vehicles).values({
        personId: person.id,
        type: v.type,
        name: v.name,
        modelKey: v.modelKey,
        co2KgPerKm,
        trackingMode: 'simulated', // research script upgrades jets to 'live' once icao24 verified
      });
    }
    console.log(`seeded ${entry.name} (${entry.vehicles.length} vehicles)`);
  }
};

run().then(() => process.exit(0));
