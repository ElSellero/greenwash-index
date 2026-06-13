import { asc, eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { events, persons } from '../src/lib/db/schema';
import { CONFIG } from '../src/config';

/**
 * One-time retroactive de-duplication for events that were ingested before the
 * dedup logic existed (e.g. an older backfill that inserted the same act many
 * times across outlets/languages).
 *
 * SAFETY: touches ONLY auto-classified NEWS events (autoClassified = true AND
 * co2Kg IS NULL). Tracked trips (co2Kg set) and human-entered events are never
 * merged or deleted. Default is a dry run; pass --apply to write.
 */
type Row = typeof events.$inferSelect;
const DAY = 86_400_000;
const apply = process.argv.includes('--apply');
const { sameEventWindowDays } = CONFIG.score.dedup;

const run = async () => {
  const allPersons = await db.select().from(persons);
  let clusters = 0;
  let toDelete = 0;
  for (const p of allPersons) {
    const rows: Row[] = (await db.select().from(events)
      .where(eq(events.personId, p.id))
      .orderBy(asc(events.occurredAt), asc(events.id)))
      .filter((r) => r.autoClassified && r.co2Kg == null); // news events only

    // group by kind+type, then cluster chronologically within the same-event window
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const key = `${r.kind}|${r.type}`;
      const g = groups.get(key) ?? [];
      g.push(r);
      groups.set(key, g);
    }

    for (const group of groups.values()) {
      let anchor: Row | null = null;
      let bucket: Row[] = [];
      const flush = async () => {
        if (anchor && bucket.length > 1) {
          clusters++;
          const extras = bucket.slice(1);
          toDelete += extras.length;
          const urls = new Set<string>([
            anchor.sourceUrl,
            ...(anchor.extraSources ?? []),
            ...extras.flatMap((e) => [e.sourceUrl, ...(e.extraSources ?? [])]),
          ]);
          urls.delete(anchor.sourceUrl);
          console.log(
            `  ${p.name} [${anchor.kind}/${anchor.type}] ${anchor.occurredAt.toISOString().slice(0, 10)} `
            + `"${anchor.title.slice(0, 60)}" — keep #${anchor.id}, fold ${extras.length} (${extras.map((e) => e.id).join(',')})`,
          );
          if (apply) {
            await db.update(events)
              .set({ extraSources: [...urls] })
              .where(eq(events.id, anchor.id));
            for (const e of extras) await db.delete(events).where(eq(events.id, e.id));
          }
        }
      };
      for (const r of group) {
        if (anchor && (r.occurredAt.getTime() - anchor.occurredAt.getTime()) / DAY <= sameEventWindowDays) {
          bucket.push(r); // same act as the current anchor
        } else {
          await flush();
          anchor = r;
          bucket = [r];
        }
      }
      await flush();
    }
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY RUN'} — ${clusters} duplicate clusters, ${toDelete} rows folded into their anchor.`);
  if (!apply) console.log('Re-run with --apply to write.');
};

run().then(() => process.exit(0));
