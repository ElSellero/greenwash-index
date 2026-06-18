import { and, eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { events, persons } from '../src/lib/db/schema';

/**
 * Ingest documented historical jet-emission figures from published reports as
 * source-cited events (classifier 'report:*'). Defensible: every figure carries
 * the report URL; descriptions mirror the report's own attribution caveats.
 * Idempotent per (person, classifier) — re-running replaces that report's rows.
 * Dry-run by default; --apply writes.
 *
 * Dated to each report's period, so these populate person timelines and all-time
 * CO2 totals; older ones fall OUTSIDE the rolling 12-month score window.
 */
const apply = process.argv.includes('--apply');

type Report = {
  slug: string;
  tons: number;
  flights?: number;
  date: string; // ISO; representative date of the report period
  classifier: string; // 'report:<slug>'
  url: string;
  caveat: string;
  note?: string;
};

const YARD_CAVEAT = "Per Yard's 2022 study of public CelebrityJets tracking data; the figure is for the aircraft over Jan–Jul 2022 and may include flights taken by others.";
const YARD = (slug: string, tons: number, flights?: number, note?: string): Report => ({
  slug, tons, flights, date: '2022-07-29', classifier: 'report:yard-2022',
  url: 'https://weareyard.com/insights/worst-celebrity-private-jet-co2-emission-offenders',
  caveat: YARD_CAVEAT, note,
});

const REPORTS: Report[] = [
  YARD('taylor-swift', 8293.54, 170, " Swift's team says the jet is loaned out, so attributing all flights to her is disputed."),
  YARD('floyd-mayweather', 7076.8, 177),
  YARD('jay-z', 6981.3, 136, ' A lawyer for Jay-Z says he does not own the jet (the PUMA jet, N444SC).'),
  YARD('steven-spielberg', 4465, 61),
  YARD('kim-kardashian', 4268.5, 57),
  YARD('oprah-winfrey', 3493.17, 68),
  YARD('travis-scott', 3033.3),
  {
    slug: 'elon-musk', tons: 2112, flights: 171, date: '2022-12-31', classifier: 'report:ips-2022',
    url: 'https://fortune.com/2023/05/01/elon-musk-private-jet-use-carbon-emissions-climate-change/',
    caveat: 'Full-year 2022 jet emissions per the Institute for Policy Studies / Patriotic Millionaires report (171 flights).',
  },
];

const run = async () => {
  let written = 0;
  for (const r of REPORTS) {
    const person = await db.query.persons.findFirst({ where: eq(persons.slug, r.slug) });
    if (!person) { console.log(`SKIP ${r.slug} — not in roster`); continue; }
    const flightTxt = r.flights ? `${r.flights} flights, ` : '';
    const title = `${r.date.slice(0, 4)} private-jet emissions: ${flightTxt}${Math.round(r.tons).toLocaleString('en-US')} t CO2`;
    const description = `${r.caveat}${r.note ?? ''}`;
    console.log(`${apply ? 'WRITE' : 'DRY'} ${person.name} [${r.classifier}]: ${Math.round(r.tons)} t  "${title}"`);
    if (apply) {
      await db.delete(events).where(and(eq(events.personId, person.id), eq(events.classifier, r.classifier)));
      await db.insert(events).values({
        personId: person.id,
        kind: 'negative',
        type: 'flight',
        title,
        description,
        sourceUrl: r.url,
        occurredAt: new Date(`${r.date}T12:00:00Z`),
        co2Kg: r.tons * 1000,
        confidence: null,
        autoClassified: false,
        classifier: r.classifier,
        reviewed: true,
      });
      written++;
    }
  }
  console.log(`\n${apply ? `APPLIED — ${written} report events written.` : `DRY RUN — ${REPORTS.length} entries. Re-run with --apply to write.`}`);
};

run().then(() => process.exit(0)).catch((err) => { console.error('seed-reports failed:', err); process.exit(1); });
