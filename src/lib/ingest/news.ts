import { XMLParser } from 'fast-xml-parser';
import { personNameQuery } from './personSearch';

export type Article = { title: string; url: string; publishedAt: Date };

export const parseGoogleNewsRss = (xml: string): Article[] => {
  try {
    const doc = new XMLParser().parse(xml);
    const items = doc?.rss?.channel?.item;
    const list = Array.isArray(items) ? items : items ? [items] : [];
    return list
      .filter((i: Record<string, unknown>) => typeof i.link === 'string' && typeof i.title === 'string')
      .map((i: { title: string; link: string; pubDate?: string }) => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate ? new Date(i.pubDate) : new Date(),
      }));
  } catch {
    return [];
  }
};

export const parseGdelt = (json: unknown): Article[] => {
  const articles = (json as { articles?: { title?: string; url?: string; seendate?: string }[] })?.articles ?? [];
  return articles
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title: a.title!,
      url: a.url!,
      publishedAt: a.seendate
        ? new Date(a.seendate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/, '$1-$2-$3T$4:$5:$6Z'))
        : new Date(),
    }));
};

export const dedupeArticles = (articles: Article[]): Article[] => {
  const seen = new Set<string>();
  return articles.filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)));
};

const CLIMATE_TERMS = '(climate OR emissions OR sustainability OR "private jet" OR yacht OR donation)';

export const fetchArticlesFor = async (slug: string, name: string): Promise<Article[]> => {
  const nameClause = personNameQuery(slug, name);
  const out: Article[] = [];
  try {
    const q = encodeURIComponent(`${nameClause} ${CLIMATE_TERMS}`);
    const res = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) out.push(...parseGoogleNewsRss(await res.text()));
  } catch { /* degrade */ }
  try {
    const q = encodeURIComponent(`${nameClause} climate`);
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=25&format=json&timespan=2d`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (res.ok) out.push(...parseGdelt(await res.json()));
  } catch { /* degrade */ }
  return dedupeArticles(out);
};
