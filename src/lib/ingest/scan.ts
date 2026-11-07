import type { Article, NewsFetchResult } from './news';

export type ScanPerson = { id: number; slug: string; name: string };
export type ScanSummary = {
  persons: number; candidates: number; attempted: number; stored: number;
  merged: number; rejected: number; seen: number; sourceErrors: number;
  classificationErrors: number; storageErrors: number; sourcesOk: number;
  stopped: 'complete' | 'budget' | 'cap';
};
export type ArticleOutcome = 'stored' | 'merged' | 'rejected' | 'seen' | 'classificationErrors' | 'storageErrors';

/** Resume after the last visited person, including after crashes and empty/error feeds. */
export const scanOrder = (persons: ScanPerson[], lastId: number) => {
  const sorted = [...persons].sort((a, b) => a.id - b.id);
  return [...sorted.filter(p => p.id > lastId), ...sorted.filter(p => p.id <= lastId)];
};

export const scanPersons = async (options: {
  persons: ScanPerson[]; lastId: number; cap: number; deadline: number; perPerson: number;
  checkpoint: (id: number) => Promise<void>;
  fetch: (p: ScanPerson) => Promise<NewsFetchResult>;
  process: (p: ScanPerson, a: Article) => Promise<ArticleOutcome>;
  now?: () => number;
}): Promise<ScanSummary> => {
  const now = options.now ?? Date.now;
  const result: ScanSummary = { persons: 0, candidates: 0, attempted: 0, stored: 0,
    merged: 0, rejected: 0, seen: 0, sourceErrors: 0, classificationErrors: 0,
    storageErrors: 0, sourcesOk: 0, stopped: 'complete' };
  for (const p of scanOrder(options.persons, options.lastId)) {
    // Reserve enough room for fetching, one bounded classification and persistence.
    if (now() + 80_000 > options.deadline) { result.stopped = 'budget'; break; }
    if (result.attempted >= options.cap) { result.stopped = 'cap'; break; }
    await options.checkpoint(p.id);
    result.persons++;
    const fetched = await options.fetch(p);
    result.sourceErrors += fetched.errors.length;
    result.sourcesOk += fetched.sourcesOk;
    result.candidates += fetched.articles.length;
    let attempted = 0;
    for (const article of fetched.articles) {
      if (now() + 50_000 > options.deadline) { result.stopped = 'budget'; return result; }
      if (result.attempted >= options.cap || attempted >= options.perPerson) break;
      const outcome = await options.process(p, article);
      result[outcome]++;
      if (outcome !== 'seen') { attempted++; result.attempted++; }
    }
  }
  return result;
};
