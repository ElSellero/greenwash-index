import { createHash } from 'node:crypto';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { events, persons, seenArticles } from '@/lib/db/schema';
import { fetchArticlesFor, type Article } from './news';
import {
  classifierChain, interCallDelayMs, isOllama, maxClassificationsPerRun,
  ollamaGenerateObject, ollamaLabel, runWithFallback, type Attempt,
} from './llm';
import { dedupDecision } from './dedup';
import { CONFIG } from '@/config';

export const classificationSchema = z.object({
  relevant: z.boolean(),
  kind: z.enum(['positive', 'negative']),
  type: z.enum(['post', 'donation', 'investment', 'interview', 'speech', 'preaching', 'flight', 'yacht_trip', 'asset']),
  // no length cap here (a local model may overrun it; toJSONSchema also can't
  // express transforms) — title/summary are truncated at store time instead
  title: z.string(),
  summary: z.string(),
  // unbounded here (local models overrun bounds and toJSONSchema grammar won't
  // enforce them); clamped to [0,1] in classifyArticle
  confidence: z.number(),
  // accepts plain dates and full ISO timestamps; consumers slice to the date part.
  // fully anchored (^...$) so Ollama's structured-output grammar accepts the pattern.
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}.*$/),
});
export type Classification = z.infer<typeof classificationSchema>;

export const passesGuardrails = (c: Classification, sourceUrl: string): boolean =>
  c.relevant &&
  c.confidence >= CONFIG.score.confidenceThreshold &&
  /^https?:\/\//.test(sourceUrl);

const urlHash = (url: string): string => createHash('sha256').update(url).digest('hex');

const SYSTEM = `You classify ONE news headline about a public figure for a climate-accountability index. Output JSON only.

relevant=true ONLY if the headline documents a concrete act by THIS person in one of these categories:
NEGATIVE (high-emission acts):
- flight: their private jet/helicopter took flight(s), or a report about their jet's flights/emissions/usage. relevant=true EVEN IF the article is critical, satirical, or about "criticism".
- yacht_trip: they cruised, used, or were seen on a yacht/superyacht.
- asset: they bought or own a superyacht, private jet, or mega-mansion.
POSITIVE (pro-climate acts):
- donation: gave money to a climate/environmental cause.
- investment: invested in green/clean technology.
- interview / speech / post: publicly stated a pro-climate view.
- preaching: publicly urged OTHERS to fly less / eat less meat / live greener.

relevant=false for gossip, dating, fashion, awards, general business, or anything not in those categories.
NEVER infer beyond the headline. Low information ⇒ low confidence. eventDate = the date only, YYYY-MM-DD.
Write "title" and "summary" in concise ENGLISH, even when the source headline is in another language (translate it).

Examples:
"X's private jet took 170 flights this year" => relevant=true, negative, flight
"X's $185m private jet criticised for short hops" => relevant=true, negative, flight
"X spotted on a $300m superyacht in Monaco" => relevant=true, negative, yacht_trip
"X donates $10bn to fight climate change" => relevant=true, positive, donation
"X urges fans to eat less meat for the planet" => relevant=true, positive, preaching
"X seen having lunch with friends" => relevant=false`;

/** A classification plus the provenance label of the model that produced it. */
export type ClassifiedResult = Classification & { classifier: string };

const buildAttempts = (prompt: string, geminiOnly: boolean): Attempt<Classification>[] => {
  // cloud tiers first (Gemini 3.5 → 3.1-lite)
  const attempts: Attempt<Classification>[] = classifierChain().map(({ label, model }) => ({
    label,
    run: async () => (await generateObject({
      model,
      schema: classificationSchema,
      system: SYSTEM,
      prompt,
      // turn a hung network call into a retryable error so the loop never stalls
      abortSignal: AbortSignal.timeout(60_000),
    })).object,
  }));
  // local Ollama as last resort — but re-verification deliberately skips it
  if (!geminiOnly && isOllama()) {
    attempts.push({ label: ollamaLabel(), run: () => ollamaGenerateObject(classificationSchema, SYSTEM, prompt) });
  }
  return attempts;
};

/**
 * Classify a single prompt through the fallback chain. `geminiOnly` skips the
 * local Ollama tier — used by re-verification, which must upgrade Ollama-classified
 * rows with a cloud model, never re-confirm them with the same weak local one.
 */
export const runClassification = async (
  prompt: string,
  geminiOnly = false,
): Promise<ClassifiedResult | null> => {
  try {
    const { value, label } = await runWithFallback(buildAttempts(prompt, geminiOnly));
    // local models overrun [0,1]; clamp so the guardrail and ticker stay sane
    return { ...value, confidence: Math.min(1, Math.max(0, value.confidence)), classifier: label };
  } catch {
    return null;
  }
};

export const classifyArticle = (
  personName: string,
  article: Article,
): Promise<ClassifiedResult | null> =>
  runClassification(
    `Person: ${personName}\nHeadline: ${article.title}\nPublished: ${article.publishedAt.toISOString()}`,
  );

export const advocacyWeightFor = (type: Classification['type']): number =>
  CONFIG.score.advocacyWeights[type as keyof typeof CONFIG.score.advocacyWeights] ?? 1;

export type StoreResult = 'merged' | 'echo' | 'new';

/**
 * Persist a passing classification with de-duplication: many outlets covering
 * the same act collapse into one event (extra URLs linked, counted once); a
 * genuine later re-statement is stored separately but down-weighted. Shared by
 * the daily news scan and the historical backfill so everyone is treated alike.
 */
export const storeClassifiedEvent = async (
  personId: number,
  c: Classification & { classifier?: string },
  sourceUrl: string,
): Promise<StoreResult> => {
  const occurredAt = new Date(`${c.eventDate.slice(0, 10)}T12:00:00Z`);
  const windowMs = CONFIG.score.dedup.echoWindowDays * 86_400_000;
  const nearby = await db.select({ id: events.id, occurredAt: events.occurredAt })
    .from(events)
    .where(and(
      eq(events.personId, personId),
      eq(events.kind, c.kind),
      eq(events.type, c.type),
      gte(events.occurredAt, new Date(occurredAt.getTime() - windowMs)),
      lte(events.occurredAt, new Date(occurredAt.getTime() + windowMs)),
    ));

  const decision = dedupDecision(occurredAt, nearby);
  if (decision.action === 'merge') {
    // same act, another outlet — append the source unless we already have it
    await db.update(events).set({
      extraSources: sql`case
        when ${sourceUrl} = ${events.sourceUrl}
          or ${sourceUrl} = any(coalesce(${events.extraSources}, '{}'::text[]))
        then ${events.extraSources}
        else array_append(coalesce(${events.extraSources}, '{}'::text[]), ${sourceUrl})
      end`,
    }).where(eq(events.id, decision.targetId));
    return 'merged';
  }

  const echo = decision.action === 'echo';
  await db.insert(events).values({
    personId,
    kind: c.kind,
    type: c.type,
    title: c.title.slice(0, 140),
    description: c.summary.slice(0, 400),
    sourceUrl,
    occurredAt,
    advocacyWeight: c.kind === 'positive' ? advocacyWeightFor(c.type) : null,
    weightFactor: echo ? CONFIG.score.dedup.echoWeightFactor : 1,
    confidence: c.confidence,
    autoClassified: true,
    classifier: c.classifier ?? null, // 'ollama:*' = pending Gemini re-verification
  });
  return echo ? 'echo' : 'new';
};

/** Daily scan: new articles for every person → classified, guarded, stored. */
export const runNewsScan = async (): Promise<{ scanned: number; stored: number }> => {
  // Articles beyond the per-run cap are NOT marked seen — the backlog drains
  // across subsequent runs instead of blowing the serverless time budget.
  const cap = maxClassificationsPerRun();
  const allPersons = await db.select().from(persons);
  let scanned = 0;
  let stored = 0;
  let classified = 0;
  for (const p of allPersons) {
    if (classified >= cap) break;
    const articles = await fetchArticlesFor(p.name);
    for (const article of articles) {
      if (classified >= cap) break;
      scanned++;
      const hash = urlHash(article.url);
      const seen = await db.select({ id: seenArticles.id }).from(seenArticles)
        .where(eq(seenArticles.urlHash, hash)).limit(1);
      if (seen.length > 0) continue; // already processed
      classified++;
      const c = await classifyArticle(p.name, article);
      // local Ollama has no rate limit; only pace cloud (Gemini) calls
      if (!c?.classifier?.startsWith('ollama')) {
        const delay = interCallDelayMs();
        if (delay) await new Promise((r) => setTimeout(r, delay));
      }
      if (!c) continue; // LLM error (e.g. rate limit, missing key) — retry next run
      // consume only after a successful classification
      await db.insert(seenArticles).values({ urlHash: hash }).onConflictDoNothing();
      if (!passesGuardrails(c, article.url)) continue;
      const result = await storeClassifiedEvent(p.id, c, article.url);
      if (result !== 'merged') stored++; // merges link a source but add no new event
    }
    await new Promise((r) => setTimeout(r, 500)); // politeness between persons
  }
  return { scanned, stored };
};
