import { createHash } from 'node:crypto';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { events, persons, seenArticles } from '@/lib/db/schema';
import { fetchArticlesFor, type Article } from './news';
import { CONFIG } from '@/config';

export const classificationSchema = z.object({
  relevant: z.boolean(),
  kind: z.enum(['positive', 'negative']),
  type: z.enum(['post', 'donation', 'investment', 'interview', 'speech', 'preaching', 'flight', 'yacht_trip', 'asset']),
  title: z.string().max(140),
  summary: z.string().max(400),
  confidence: z.number().min(0).max(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Classification = z.infer<typeof classificationSchema>;

export const passesGuardrails = (c: Classification, sourceUrl: string): boolean =>
  c.relevant &&
  c.confidence >= CONFIG.score.confidenceThreshold &&
  /^https?:\/\//.test(sourceUrl);

const urlHash = (url: string): string => createHash('sha256').update(url).digest('hex');

const SYSTEM = `You classify news articles about a public figure for a satirical but factually rigorous climate-accountability index.
Classify ONLY what the article headline explicitly supports. Rules:
- "positive" = verifiable pro-climate act: donation, green investment, interview, speech, social post — type "preaching" ONLY if they publicly urge OTHERS to fly less / eat less meat / live greener.
- "negative" = documented high-emission act (charter flight reported, new yacht, mansion purchase).
- relevant=false for gossip, unrelated business news, or speculation.
- NEVER infer beyond the headline. Low information ⇒ low confidence.`;

export const classifyArticle = async (
  personName: string,
  article: Article,
): Promise<Classification | null> => {
  try {
    const { object } = await generateObject({
      model: 'anthropic/claude-haiku-4-5',
      schema: classificationSchema,
      system: SYSTEM,
      prompt: `Person: ${personName}\nHeadline: ${article.title}\nPublished: ${article.publishedAt.toISOString()}`,
    });
    return object;
  } catch {
    return null;
  }
};

export const advocacyWeightFor = (type: Classification['type']): number =>
  CONFIG.score.advocacyWeights[type as keyof typeof CONFIG.score.advocacyWeights] ?? 1;

/**
 * Serverless time budget: classifying a full backlog (first run ≈ 1000 fresh
 * articles) would exceed any maxDuration. Articles beyond the cap are NOT
 * marked seen — the backlog drains across subsequent runs.
 */
const MAX_CLASSIFICATIONS_PER_RUN = 80;

/** Daily scan: new articles for every person → classified, guarded, stored. */
export const runNewsScan = async (): Promise<{ scanned: number; stored: number }> => {
  const allPersons = await db.select().from(persons);
  let scanned = 0;
  let stored = 0;
  let classified = 0;
  for (const p of allPersons) {
    if (classified >= MAX_CLASSIFICATIONS_PER_RUN) break;
    const articles = await fetchArticlesFor(p.name);
    for (const article of articles) {
      if (classified >= MAX_CLASSIFICATIONS_PER_RUN) break;
      scanned++;
      const hash = urlHash(article.url);
      const inserted = await db.insert(seenArticles).values({ urlHash: hash })
        .onConflictDoNothing().returning();
      if (inserted.length === 0) continue; // already processed
      classified++;
      const c = await classifyArticle(p.name, article);
      if (!c || !passesGuardrails(c, article.url)) continue;
      await db.insert(events).values({
        personId: p.id,
        kind: c.kind,
        type: c.type,
        title: c.title,
        description: c.summary,
        sourceUrl: article.url,
        occurredAt: new Date(`${c.eventDate}T12:00:00Z`),
        advocacyWeight: c.kind === 'positive' ? advocacyWeightFor(c.type) : null,
        confidence: c.confidence,
        autoClassified: true,
      });
      stored++;
    }
    await new Promise((r) => setTimeout(r, 500)); // politeness between persons
  }
  return { scanned, stored };
};
