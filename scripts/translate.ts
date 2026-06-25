import { eq } from 'drizzle-orm';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '../src/lib/db/client';
import { events } from '../src/lib/db/schema';
import { classifierChain, interCallDelayMs, runWithFallback, type Attempt } from '../src/lib/ingest/llm';

/**
 * Translate leftover foreign-language event titles/descriptions to English with
 * Gemini. The classifiers are SUPPOSED to emit English, but the weaker Gemini
 * tier (and old human/seed rows) sometimes kept the original-language headline.
 *
 * Non-destructive + safe to chain after every backfill: it ONLY rewrites the
 * title/description text and never touches kind/type/classifier/confidence/
 * weight — so it cannot change a score or a classification, only fix the display
 * language. Gemini-only; if the quota is exhausted it SKIPs and the next run
 * retries. Default dry-run; pass --apply to write. Optional --limit N.
 */
const apply = process.argv.includes('--apply');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

// Non-Latin scripts ⇒ untranslated. Accented Latin (é, ñ, ü) is fine and ignored.
const FOREIGN = /[Ѐ-ӿ؀-ۿͰ-Ͽ฀-๿一-鿿぀-ヿ가-힯֐-׿]/;

const SYSTEM = `Translate the given news headline and summary into concise, natural English. If the text is already English, return it unchanged. Output JSON only: {"title": string, "summary": string}. Preserve the original meaning exactly; do not editorialize, shorten aggressively, or add commentary.`;

const schema = z.object({ title: z.string(), summary: z.string() });

const translate = async (title: string, summary: string): Promise<z.infer<typeof schema> | null> => {
  const attempts: Attempt<z.infer<typeof schema>>[] = classifierChain().map(({ label, model }) => ({
    label,
    run: async () => (await generateObject({
      model, schema, system: SYSTEM,
      prompt: `Title: ${title}\nSummary: ${summary || '(none)'}`,
      abortSignal: AbortSignal.timeout(60_000),
    })).object,
  }));
  try { return (await runWithFallback(attempts)).value; } catch { return null; }
};

const run = async () => {
  const rows = await db.select({ id: events.id, title: events.title, description: events.description }).from(events);
  const foreign = rows
    .filter((r) => FOREIGN.test(r.title) || FOREIGN.test(r.description ?? ''))
    .slice(0, limit);
  console.log(`${foreign.length} events with foreign-script text to translate.\n`);

  let translated = 0, skipped = 0;
  for (const e of foreign) {
    const t = await translate(e.title, e.description ?? '');
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
