import { and, eq, sql } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { events } from '../src/lib/db/schema';
import { recomputeScores } from '../src/lib/ingest/pipeline';

// Targeted, non-destructive corrections from the 2026-11-07 source audit.
// Run only after the cancelled backfill has stopped; retain rows for inspection.
const run = async () => {
  const apply = process.argv.includes('--apply');
  const donations = await db.select().from(events).where(and(
    eq(events.personId, 2), eq(events.type, 'donation'),
    sql`${events.id} in (744, 1203)`,
  ));
  for (const e of donations) {
    if (!/grocer|food|store|Paisley/i.test(`${e.title} ${e.description}`)) throw new Error(`Unexpected event ${e.id}`);
    console.log(`Reject non-climate grocery donation #${e.id}`);
    if (apply) await db.update(events).set({ weightFactor: 0, reviewed: true, classifier: 'audit-rejected:non-climate-donation' }).where(eq(events.id, e.id));
  }
  const duplicates = await db.execute(sql`select distinct newer.id from events newer join events older
    on newer.person_id = older.person_id and older.id < newer.id
    and (newer.source_url = older.source_url or newer.source_url = any(coalesce(older.extra_sources, '{}'::text[])))
    where newer.created_at >= '2026-11-07 19:48:00' and newer.auto_classified = true and newer.weight_factor > 0`);
  for (const row of duplicates.rows) {
    console.log(`Neutralize duplicate source #${row.id}`);
    if (apply) await db.update(events).set({ weightFactor: 0, reviewed: true, classifier: 'audit-rejected:duplicate-source' }).where(eq(events.id, Number(row.id)));
  }
  // The contrails description supports a climate statement, not urging personal lifestyle changes.
  if (apply) await db.update(events).set({ type: 'post', advocacyWeight: 1, reviewed: true })
    .where(and(eq(events.id, 1205), eq(events.personId, 4), eq(events.type, 'preaching')));
  if (apply && process.argv.includes('--release-cancelled-lease')) {
    await db.execute(sql`update news_scan_state set lease_until = '1970-01-01', lease_owner = null where id = 1`);
    console.log('Released lease of confirmed cancelled backfill');
  }
  if (apply) console.log(`Recomputed ${await recomputeScores()} scores`);
};
run().catch(err => { console.error(err); process.exitCode = 1; });
