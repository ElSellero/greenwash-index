import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseGoogleNewsRss, parseGdelt, dedupeArticles, fetchArticlesFor } from '@/lib/ingest/news';

const rss = `<?xml version="1.0"?><rss><channel>
<item><title>Musk speaks on climate</title><link>https://example.com/a</link><pubDate>Tue, 09 Jun 2026 10:00:00 GMT</pubDate><source url="https://example.com">Example</source></item>
<item><title>Second item</title><link>https://example.com/b</link><pubDate>Mon, 08 Jun 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

describe('parseGoogleNewsRss', () => {
  it('extracts title/url/date', () => {
    const items = parseGoogleNewsRss(rss);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'Musk speaks on climate', url: 'https://example.com/a' });
    expect(items[0]!.publishedAt.getUTCDate()).toBe(9);
  });
  it('reports malformed feeds instead of treating them as empty', () => {
    expect(() => parseGoogleNewsRss('not xml at all')).toThrow();
  });
});

describe('parseGdelt', () => {
  it('maps articles', () => {
    const json = { articles: [{ title: 'T', url: 'https://x.com/1', seendate: '20260609T100000Z' }] };
    expect(parseGdelt(json)[0]).toMatchObject({ title: 'T', url: 'https://x.com/1' });
  });
});

describe('dedupeArticles', () => {
  it('drops duplicate URLs', () => {
    const a = { title: 'a', url: 'https://x.com/1', publishedAt: new Date() };
    expect(dedupeArticles([a, { ...a, title: 'b' }])).toHaveLength(1);
  });
});


afterEach(() => vi.unstubAllGlobals());
it('rejects invalid/missing dates rather than inventing fresh publication dates', () => {
  expect(parseGoogleNewsRss('<rss><channel><item><title>T</title><link>https://example.com</link><pubDate>bad</pubDate></item></channel></rss>')).toEqual([]);
  expect(parseGdelt({ articles: [{ title: 'T', url: 'https://example.com' }] })).toEqual([]);
  expect(() => parseGdelt({ error: 'rate limited' })).toThrow();
});
it('keeps Google results when GDELT fails and exposes the failure', async () => {
  const today = new Date().toUTCString();
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(rss.replaceAll('Tue, 09 Jun 2026 10:00:00 GMT', today)))
    .mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
  vi.stubGlobal('fetch', fetchMock);
  const result = await fetchArticlesFor('musk', 'Elon Musk');
  expect(result.articles).toHaveLength(1);
  expect(result.sourcesOk).toBe(1);
  expect(result.errors).toEqual(['gdelt: HTTP 429']);
  expect(decodeURIComponent(fetchMock.mock.calls[0]![0])).toContain('when:14d');
  expect(decodeURIComponent(fetchMock.mock.calls[1]![0])).toContain('private jet');
});
