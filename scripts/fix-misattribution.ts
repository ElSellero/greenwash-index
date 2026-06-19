import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { events, persons } from '../src/lib/db/schema';

/**
 * Delete auto-classified events that were attributed to the wrong person:
 * the assigned person's name does NOT appear in the title, but ANOTHER roster
 * person's full name does (e.g. a "Mark Zuckerberg $300M yacht" item filed under
 * Bill Gates). Conservative — only flags clear cross-person mismatches.
 * Dry-run by default; --apply deletes.
 */
const apply = process.argv.includes('--apply');

const STOP = new Set(['the', 'of', 'and', 'for', 'von', 'der', 'die', 'das']);
const tokens = (name: string) =>
  name.toLowerCase().split(/[\s-]+/).filter((t) => t.length >= 3 && !STOP.has(t));

const run = async () => {
  const all = await db.select({ id: persons.id, name: persons.name }).from(persons);
  const byId = new Map(all.map((p) => [p.id, p]));
  const fullNames = all.map((p) => ({ id: p.id, full: p.name.toLowerCase() }));

  // only consider auto-classified events (never touch curated report rows)
  const rows = await db.select({ id: events.id, personId: events.personId, title: events.title })
    .from(events).where(and(eq(events.autoClassified, true), isNull(events.co2Kg)));

  const flagged: { id: number; person: string; title: string; other: string }[] = [];
  for (const e of rows) {
    const t = e.title.toLowerCase();
    const assigned = byId.get(e.personId);
    if (!assigned) continue;
    const assignedHit = tokens(assigned.name).some((tok) => t.includes(tok));
    if (assignedHit) continue;
    const other = fullNames.find((p) => p.id !== e.personId && t.includes(p.full));
    if (other) flagged.push({ id: e.id, person: assigned.name, title: e.title.slice(0, 60), other: byId.get(other.id)!.name });
  }

  console.log(`${flagged.length} misattributed events:`);
  for (const f of flagged) console.log(`  #${f.id} ${f.person} ⇒ about ${f.other}: "${f.title}"`);
  if (apply) {
    for (const f of flagged) await db.delete(events).where(eq(events.id, f.id));
    console.log(`\nAPPLIED — deleted ${flagged.length} misattributed events.`);
  } else {
    console.log('\nDRY RUN — re-run with --apply to delete.');
  }
};

run().then(() => process.exit(0)).catch((err) => { console.error('fix-misattribution failed:', err); process.exit(1); });
