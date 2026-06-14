import { and, eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { events, persons } from '../src/lib/db/schema';

/**
 * Ingest documented historical jet-emission figures from published reports as
 * source-cited events (classifier 'report:*'). Defensible: every figure carries
 * the report URL; descriptions mirror the report's own attribution caveats.
 * Idempotent — re-running replaces the same report's rows. Dry-run by default;
 * --apply writes.
 *
 * NOTE: dated to the report period (2022), so these populate person timelines
 * and all-time CO2 totals; they fall OUTSIDE the rolling 12-month score window.
 */
const apply = process.argv.includes('--apply');

const YARD = {
  url: 'https://weareyard.com/insights/worst-celebrity-private-jet-co2-emission-offenders',
  classifier: 'report:yard-2022',
  occurredAt: new Date('2022-07-29T12:00:00Z'),
  // Yard 2022 study of public CelebrityJets tracking data (Jan–Jul 2022)
  caveat: 'Figure is for the aircraft over Jan–Jul 2022 and may include flights taken by others.',
};

type Entry = { slug: string; tons: number; flights?: number; note?: string };
const ENTRIES: Entry[] = [
  { slug: 'taylor-swift', tons: 8293.54, flights: 170, note: " Swift's team says the jet is loaned out, so attributing all flights to her is disputed." },
  { slug: 'floyd-mayweather', tons: 7076.8, flights: 177 },
  { slug: 'jay-z', tons: 6981.3, flights: 136, note: " A lawyer for Jay-Z says he does not own the jet (the PUMA jet, N444SC)." },
  { slug: 'steven-spielberg', tons: 4465, flights: 61 },
  { slug: 'kim-kardashian', tons: 4268.5, flights: 57 },
  { slug: 'oprah-winfrey', tons: 3493.17, flights: 68 },
  { slug: 'travis-scott', tons: 3033.3 },
];

const run = async () => {
  let written = 0;
  for (const e of ENTRIES) {
    const person = await db.query.persons.findFirst({ where: eq(persons.slug, e.slug) });
    if (!person) { console.log(`SKIP ${e.slug} — not in roster`); continue; }
    const flightTxt = e.flights ? `${e.flights} flights, ` : '';
    const title = `2022 private-jet emissions: ${flightTxt}${Math.round(e.tons).toLocaleString('en-US')} t CO2 (Yard study)`;
    const description = `Per Yard's 2022 study of public CelebrityJets tracking data. ${YARD.caveat}${e.note ?? ''}`;
    console.log(`${apply ? 'WRITE' : 'DRY'} ${person.name}: ${Math.round(e.tons)} t  "${title}"`);
    if (apply) {
      await db.delete(events).where(and(eq(events.personId, person.id), eq(events.classifier, YARD.classifier)));
      await db.insert(events).values({
        personId: person.id,
        kind: 'negative',
        type: 'flight',
        title,
        description,
        sourceUrl: YARD.url,
        occurredAt: YARD.occurredAt,
        co2Kg: e.tons * 1000,
        confidence: null, // human-curated from a cited source
        autoClassified: false,
        classifier: YARD.classifier,
        reviewed: true,
      });
      written++;
    }
  }
  console.log(`\n${apply ? `APPLIED — ${written} report events written.` : `DRY RUN — ${ENTRIES.length} entries. Re-run with --apply to write.`}`);
};

run().then(() => process.exit(0)).catch((err) => { console.error('seed-reports failed:', err); process.exit(1); });
