import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { persons, events, seenArticles } from '../src/lib/db/schema';
import { parseGdelt, dedupeArticles, type Article } from '../src/lib/ingest/news';
import { classifyArticle, passesGuardrails, advocacyWeightFor } from '../src/lib/ingest/classify';
import { interCallDelayMs } from '../src/lib/ingest/llm';
import { createHash } from 'node:crypto';

/** GDELT full-text archive reaches back years — query in 6-month windows. */
const fetchHistorical = async (name: string): Promise<Article[]> => {
  const out: Article[] = [];
  const windows = ['2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026'];
  for (const w of windows) {
    const [from, to] = w.split('-');
    const q = encodeURIComponent(`"${name}" (climate OR "private jet" OR yacht OR donation)`);
    try {
      const res = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=50&format=json&startdatetime=${from}0101000000&enddatetime=${to}0101000000`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (res.ok) out.push(...parseGdelt(await res.json()));
    } catch { /* skip window */ }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return dedupeArticles(out);
};

const run = async () => {
  const allPersons = await db.select().from(persons);
  for (const p of allPersons) {
    console.log(`\n=== ${p.name} ===`);
    const articles = await fetchHistorical(p.name);
    console.log(`  ${articles.length} candidate articles`);
    for (const article of articles) {
      const hash = createHash('sha256').update(article.url).digest('hex');
      const seen = await db.select({ id: seenArticles.id }).from(seenArticles)
        .where(eq(seenArticles.urlHash, hash)).limit(1);
      if (seen.length > 0) continue;
      const c = await classifyArticle(p.name, article);
      const delay = interCallDelayMs();
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (!c) continue; // LLM error / rate limit — stays unseen, next run retries
      await db.insert(seenArticles).values({ urlHash: hash }).onConflictDoNothing();
      if (!passesGuardrails(c, article.url)) continue;
      await db.insert(events).values({
        personId: p.id, kind: c.kind, type: c.type, title: c.title,
        description: c.summary, sourceUrl: article.url,
        occurredAt: new Date(`${c.eventDate}T12:00:00Z`),
        advocacyWeight: c.kind === 'positive' ? advocacyWeightFor(c.type) : null,
        confidence: c.confidence, autoClassified: true,
      });
      console.log(`  + [${c.kind}/${c.type}] ${c.title}`);
    }
  }
};

run().then(() => process.exit(0));
