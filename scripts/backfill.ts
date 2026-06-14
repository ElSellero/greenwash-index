import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { persons, seenArticles } from '../src/lib/db/schema';
import { parseGdelt, dedupeArticles, type Article } from '../src/lib/ingest/news';
import { classifyArticle, passesGuardrails, storeClassifiedEvent } from '../src/lib/ingest/classify';
import { interCallDelayMs } from '../src/lib/ingest/llm';
import { createHash } from 'node:crypto';

/** GDELT asks for <= 1 query / 5s; faster gets throttled to empty results. */
const GDELT_WINDOW_DELAY_MS = 6_000;

/** GDELT full-text archive reaches back years — query in yearly windows. */
const fetchHistorical = async (name: string): Promise<Article[]> => {
  const out: Article[] = [];
  const windows = ['2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026'];
  for (const w of windows) {
    const [from, to] = w.split('-');
    const q = encodeURIComponent(`"${name}" (climate OR "private jet" OR yacht OR donation)`);
    // one retry — GDELT throttling shows up as a non-ok status or a thrown timeout
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(
          `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=50&format=json&startdatetime=${from}0101000000&enddatetime=${to}0101000000`,
          { signal: AbortSignal.timeout(20_000) },
        );
        if (res.ok) { out.push(...parseGdelt(await res.json())); break; }
      } catch { /* retry once, then skip window */ }
      await new Promise((r) => setTimeout(r, GDELT_WINDOW_DELAY_MS));
    }
  }
  return dedupeArticles(out);
};

const processArticle = async (p: { id: number; name: string }, article: Article) => {
  const hash = createHash('sha256').update(article.url).digest('hex');
  const seen = await db.select({ id: seenArticles.id }).from(seenArticles)
    .where(eq(seenArticles.urlHash, hash)).limit(1);
  if (seen.length > 0) return; // already processed in an earlier run
  const c = await classifyArticle(p.name, article);
  // local Ollama has no rate limit; only pace cloud (Gemini) calls
  if (!c?.classifier?.startsWith('ollama')) {
    const delay = interCallDelayMs();
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }
  if (!c) return; // LLM error / rate limit — stays unseen, next run retries
  await db.insert(seenArticles).values({ urlHash: hash }).onConflictDoNothing();
  if (!passesGuardrails(c, article.url)) return;
  const result = await storeClassifiedEvent(p.id, c, article.url);
  const mark = result === 'merged' ? '~ (merged source)' : result === 'echo' ? '· (echo)' : '+';
  console.log(`  ${mark} [${c.kind}/${c.type}] ${c.title}`);
};

const run = async () => {
  const allPersons = await db.select().from(persons);
  for (const p of allPersons) {
    console.log(`\n=== ${p.name} ===`);
    let articles: Article[] = [];
    try {
      articles = await fetchHistorical(p.name);
    } catch (err) {
      console.log(`  fetch failed (${err instanceof Error ? err.message : 'unknown'}) — skipping person`);
      continue;
    }
    console.log(`  ${articles.length} candidate articles`);
    for (const article of articles) {
      // one bad article (DB blip, rate spike) must never abort the whole job
      try {
        await processArticle(p, article);
      } catch (err) {
        console.log(`  ! error on "${article.title.slice(0, 50)}" — ${err instanceof Error ? err.message : 'unknown'}, skipped`);
      }
    }
  }
};

run()
  .then(() => { console.log('\nbackfill complete'); process.exit(0); })
  .catch((err) => { console.error('backfill aborted:', err); process.exit(1); });
