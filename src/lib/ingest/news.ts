import { XMLParser } from 'fast-xml-parser';
import { personNameQuery } from './personSearch';

export type Article = { title: string; url: string; publishedAt: Date };
const validArticle = (a: Article) => Number.isFinite(a.publishedAt.getTime()) && /^https?:\/\//.test(a.url);

export const parseGoogleNewsRss = (xml: string): Article[] => {
  const doc = new XMLParser().parse(xml);
  if (!doc?.rss?.channel) throw new Error('Invalid Google News RSS response');
  const items = doc.rss.channel.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];
  return list.filter((i: Record<string, unknown>) => typeof i.link === 'string' && typeof i.title === 'string')
    .map((i: { title: string; link: string; pubDate?: string }) => ({
      title: i.title, url: i.link, publishedAt: new Date(i.pubDate ?? ''),
    })).filter(validArticle);
};

export const parseGdelt = (json: unknown): Article[] => {
  if (!json || typeof json !== 'object' || !Array.isArray((json as { articles?: unknown }).articles)) {
    throw new Error('Invalid GDELT response');
  }
  return (json as { articles: Record<string, unknown>[] }).articles
    .filter(a => a && typeof a.title === 'string' && typeof a.url === 'string')
    .map(a => ({
      title: a.title as string, url: a.url as string,
      publishedAt: new Date(typeof a.seendate === 'string'
        ? a.seendate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/, '$1-$2-$3T$4:$5:$6Z') : ''),
    })).filter(validArticle);
};

export const dedupeArticles = (articles: Article[]): Article[] => {
  const seen = new Set<string>();
  return articles.filter(a => seen.has(a.url) ? false : (seen.add(a.url), true));
};

const CLIMATE_TERMS = '(climate OR emissions OR sustainability OR "private jet" OR yacht OR donation)';
export type NewsFetchResult = { articles: Article[]; errors: string[]; sourcesOk: number };
let nextGdeltRequest = 0;

export const fetchArticlesFor = async (
  slug: string, name: string, lookbackDays = 14,
): Promise<NewsFetchResult> => {
  const query = `${personNameQuery(slug, name)} ${CLIMATE_TERMS}`;
  const result: NewsFetchResult = { articles: [], errors: [], sourcesOk: 0 };
  const sources = [
    { name: 'google', url: `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:${lookbackDays}d`)}&hl=en-US&gl=US&ceid=US:en` },
    { name: 'gdelt', url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=250&sort=datedesc&format=json&timespan=${lookbackDays}d` },
  ];
  for (const source of sources) {
    try {
      if (source.name === 'gdelt') {
        await new Promise(r => setTimeout(r, Math.max(0, nextGdeltRequest - Date.now())));
        nextGdeltRequest = Date.now() + 6_000;
      }
      const res = await fetch(source.url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result.articles.push(...(source.name === 'google'
        ? parseGoogleNewsRss(await res.text()) : parseGdelt(await res.json())));
      result.sourcesOk++;
    } catch (err) {
      const error = `${source.name}: ${err instanceof Error ? err.message : 'request failed'}`;
      result.errors.push(error);
      console.warn(`[news:${slug}] ${error}`);
    }
  }
  const now = Date.now();
  result.articles = dedupeArticles(result.articles)
    .filter(a => a.publishedAt.getTime() >= now - lookbackDays * 86_400_000 && a.publishedAt.getTime() <= now)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return result;
};
