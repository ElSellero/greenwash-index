import { describe, expect, it } from 'vitest';
import { parseGoogleNewsRss, parseGdelt, dedupeArticles } from '@/lib/ingest/news';

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
  it('returns [] on garbage', () => {
    expect(parseGoogleNewsRss('not xml at all')).toEqual([]);
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
