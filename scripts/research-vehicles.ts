import { eq } from 'drizzle-orm';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '../src/lib/db/client';
import { persons, vehicles } from '../src/lib/db/schema';
import { interCallDelayMs, researchModel } from '../src/lib/ingest/llm';

const schema = z.object({
  found: z.boolean(),
  registration: z.string().nullable(),
  icao24: z.string().regex(/^[0-9a-fA-F]{6}$/).nullable(), // normalized to lowercase on store
  verificationUrl: z.string().url().nullable(),
  confidence: z.number().min(0).max(1),
});

const run = async () => {
  const jets = await db.select({
    id: vehicles.id, name: vehicles.name, personName: persons.name,
  }).from(vehicles)
    .innerJoin(persons, eq(persons.id, vehicles.personId))
    .where(eq(vehicles.type, 'jet'));

  for (const jet of jets) {
    let object: z.infer<typeof schema>;
    try {
      ({ object } = await generateObject({
        model: researchModel(), // one-time job: strongest model of the active provider
        schema,
        prompt: `Find the publicly documented aircraft registration (tail number) and ICAO24 hex code for the ${jet.name} associated with ${jet.personName}. Only report values documented in public sources (FAA registry, planespotters.net, news articles about celebrity jet tracking). Provide the URL of the best source as verificationUrl. If ownership is not publicly documented or was sold, return found=false.`,
      }));
    } catch (err) {
      console.log(`ERROR ${jet.personName} (${jet.name}) — ${err instanceof Error ? err.name : 'unknown'}, skipped`);
      const delay = interCallDelayMs();
      if (delay) await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    if (object.found && object.icao24 && object.verificationUrl && object.confidence >= 0.8) {
      const icao24 = object.icao24.toLowerCase();
      await db.update(vehicles).set({
        registration: object.registration,
        icao24,
        verificationUrl: object.verificationUrl,
        verified: false, // stays false until human spot-check below
      }).where(eq(vehicles.id, jet.id));
      console.log(`CANDIDATE ${jet.personName}: ${object.registration} / ${icao24}\n  verify: ${object.verificationUrl}\n  check:  https://globe.adsb.lol/?icao=${icao24}`);
    } else {
      console.log(`SKIPPED ${jet.personName} (${jet.name}) — no documented registration`);
    }
    const delay = interCallDelayMs();
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }
  console.log('\nNow spot-check each CANDIDATE line, then run with --confirm <icao24...> to mark verified+live.');
};

const confirm = async (hexes: string[]) => {
  for (const hex of hexes) {
    await db.update(vehicles)
      .set({ verified: true, trackingMode: 'live' })
      .where(eq(vehicles.icao24, hex));
    console.log(`verified + live: ${hex}`);
  }
};

const args = process.argv.slice(2);
(args[0] === '--confirm' ? confirm(args.slice(1)) : run()).then(() => process.exit(0));
