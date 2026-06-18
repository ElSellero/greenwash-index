import { eq, like } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { events, persons } from '../src/lib/db/schema';
import { runClassification, passesGuardrails, advocacyWeightFor } from '../src/lib/ingest/classify';
import { interCallDelayMs } from '../src/lib/ingest/llm';

/**
 * Re-verify events that were classified by the local fallback model
 * (classifier 'ollama:*') with a cloud Gemini model, now that tokens are
 * available. Gemini-only (never falls back to Ollama).
 *
 * - Gemini confirms it (passes guardrails) → UPDATE the row with Gemini's
 *   classification + provenance, mark reviewed. The weak-model guess is upgraded.
 * - Gemini rejects it (irrelevant / low confidence) → neutralize it (mark
 *   classifier 'gemini-rejected', weight_factor 0) so it stops counting but is
 *   kept for audit — non-destructive, safe for unattended runs.
 * - Gemini unavailable (quota/network) → skip; the row stays 'ollama:*' for a
 *   later run.
 *
 * Default is a dry run; pass --apply to write. Needs GOOGLE_GENERATIVE_AI_API_KEY.
 * Do NOT set OLLAMA_MODEL (runClassification is called Gemini-only regardless).
 */
const apply = process.argv.includes('--apply');

const run = async () => {
  const rows = await db.select({
    id: events.id,
    personName: persons.name,
    kind: events.kind,
    type: events.type,
    title: events.title,
    description: events.description,
    sourceUrl: events.sourceUrl,
    classifier: events.classifier,
  }).from(events)
    .innerJoin(persons, eq(persons.id, events.personId))
    .where(like(events.classifier, 'ollama%'));

  console.log(`${rows.length} Ollama-classified events to re-verify with Gemini.\n`);
  let upgraded = 0;
  let rejected = 0;
  let skipped = 0;

  for (const e of rows) {
    const headline = e.description ? `${e.title} — ${e.description}` : e.title;
    const c = await runClassification(
      `Person: ${e.personName}\nHeadline: ${headline}\nPublished: (from a prior report)`,
      true, // Gemini only
    );
    const delay = interCallDelayMs();
    if (delay) await new Promise((r) => setTimeout(r, delay));

    if (!c) {
      skipped++;
      console.log(`SKIP   #${e.id} (Gemini unavailable) — ${e.title.slice(0, 55)}`);
      continue;
    }
    if (!passesGuardrails(c, e.sourceUrl)) {
      rejected++;
      console.log(`REJECT #${e.id} (Gemini: ${c.relevant ? 'low confidence' : 'not relevant'}) — neutralized — ${e.title.slice(0, 50)}`);
      // non-destructive: keep the row for audit but mark it rejected and drop its
      // score weight, instead of deleting (safe for unattended runs, no data loss)
      if (apply) {
        await db.update(events).set({ classifier: 'gemini-rejected', weightFactor: 0, reviewed: true })
          .where(eq(events.id, e.id));
      }
      continue;
    }
    upgraded++;
    const changed = c.kind !== e.kind || c.type !== e.type;
    console.log(`UPGRADE #${e.id} ${e.classifier} → ${c.classifier}${changed ? ` [${e.kind}/${e.type} → ${c.kind}/${c.type}]` : ` [${c.kind}/${c.type}]`} — ${c.title.slice(0, 50)}`);
    if (apply) {
      await db.update(events).set({
        kind: c.kind,
        type: c.type,
        title: c.title.slice(0, 140),
        description: c.summary.slice(0, 400),
        advocacyWeight: c.kind === 'positive' ? advocacyWeightFor(c.type) : null,
        confidence: c.confidence,
        classifier: c.classifier,
        reviewed: true,
      }).where(eq(events.id, e.id));
    }
  }

  console.log(`\n${apply ? 'APPLIED' : 'DRY RUN'} — upgraded ${upgraded}, rejected ${rejected}, skipped ${skipped} (of ${rows.length}).`);
  if (!apply && rows.length > 0) console.log('Re-run with --apply to write.');
};

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error('reverify aborted:', err); process.exit(1); });
