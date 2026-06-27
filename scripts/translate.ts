import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { events } from '../src/lib/db/schema';
import { interCallDelayMs } from '../src/lib/ingest/llm';
import { FOREIGN, translateToEnglish } from '../src/lib/ingest/translate';

/**
 * Backstop cleanup: translate leftover foreign-language event titles/descriptions
 * to English. New events are now translated INLINE at ingest (storeClassifiedEvent),
 * so this only mops up legacy human/seed rows and any older untranslated events.
 *
 * Non-destructive + safe to chain after every backfill: it ONLY rewrites the
 * title/description text and never touches kind/type/classifier/confidence/
 * weight — so it cannot change a score or a classification, only fix the display
 * language. Gemini-only; if the quota is exhausted it SKIPs and the next run
 * retries. Default dry-run; pass --apply to write. Optional --limit=N.
 */
const apply = process.argv.includes('--apply');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

const run = async () => {
  const rows = await db.select({ id: events.id, title: events.title, description: events.description }).from(events);
  const foreign = rows
    .filter((r) => FOREIGN.test(r.title) || FOREIGN.test(r.description ?? ''))
    .slice(0, limit);
  console.log(`${foreign.length} events with foreign-script text to translate.\n`);

  let translated = 0, skipped = 0;
  for (const e of foreign) {
    const t = await translateToEnglish(e.title, e.description ?? '');
    const delay = interCallDelayMs();
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (!t) { skipped++; console.log(`SKIP #${e.id} (Gemini unavailable) — ${e.title.slice(0, 45)}`); continue; }
    translated++;
    console.log(`#${e.id}: ${e.title.slice(0, 35)} → ${t.title.slice(0, 50)}`);
    if (apply) {
      await db.update(events)
        .set({ title: t.title.slice(0, 140), description: t.summary.slice(0, 400) })
        .where(eq(events.id, e.id));
    }
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY RUN'} — translated ${translated}, skipped ${skipped} (of ${foreign.length}).`);
  if (!apply && foreign.length > 0) console.log('Re-run with --apply to write.');
};

run().then(() => process.exit(0)).catch((err) => { console.error('translate aborted:', err); process.exit(1); });
