import { and, eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { persons, vehicles } from '../src/lib/db/schema';

/**
 * Populate yacht MMSIs from public maritime registries (vesselfinder/
 * marinetraffic, which name the owner → defensible). Sets verified + source.
 * trackingMode is left as-is for now; the AIS collector reads vehicles.mmsi.
 * Idempotent. Dry-run by default; --apply writes.
 */
const apply = process.argv.includes('--apply');

type Entry = { slug: string; yacht: string; mmsi: string };
const ENTRIES: Entry[] = [
  { slug: 'jeff-bezos', yacht: 'Koru', mmsi: '319225400' },
  { slug: 'roman-abramovich', yacht: 'Eclipse', mmsi: '310593000' },
  { slug: 'david-geffen', yacht: 'Rising Sun', mmsi: '319011000' },
  { slug: 'alisher-usmanov', yacht: 'Dilbar', mmsi: '319094900' },
  { slug: 'larry-ellison', yacht: 'Musashi', mmsi: '319032600' },
  { slug: 'sergey-brin', yacht: 'Dragonfly', mmsi: '319296900' },
  { slug: 'steve-wynn', yacht: 'Aquarius', mmsi: '319107400' },
  { slug: 'tiger-woods', yacht: 'Privacy', mmsi: '319164000' },
];

const run = async () => {
  let written = 0;
  for (const e of ENTRIES) {
    const person = await db.query.persons.findFirst({ where: eq(persons.slug, e.slug) });
    if (!person) { console.log(`SKIP ${e.slug} — not in roster`); continue; }
    console.log(`${apply ? 'WRITE' : 'DRY'} ${person.name} — ${e.yacht}: mmsi ${e.mmsi}`);
    if (apply) {
      await db.update(vehicles).set({
        mmsi: e.mmsi,
        verified: true,
        verificationUrl: `https://www.vesselfinder.com/?mmsi=${e.mmsi}`,
      }).where(and(eq(vehicles.personId, person.id), eq(vehicles.type, 'yacht')));
      written++;
    }
  }
  console.log(`\n${apply ? `APPLIED — ${written} yachts updated.` : `DRY RUN — ${ENTRIES.length} entries. Re-run with --apply.`}`);
};

run().then(() => process.exit(0)).catch((err) => { console.error('seed-mmsi failed:', err); process.exit(1); });
