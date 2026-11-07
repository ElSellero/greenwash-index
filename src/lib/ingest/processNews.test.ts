import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ generateObject: vi.fn(), insert: vi.fn(), writes: [] as string[], failEvent: false, existing: false }));
vi.mock('ai', () => ({ generateObject: mocks.generateObject }));
vi.mock('@/lib/db/client', async () => {
  const { events } = await import('@/lib/db/schema');
  return { db: {
    select: () => ({ from: (table: unknown) => ({ where: () => ({
      limit: async () => mocks.existing && table === events ? [{ id: 1 }] : [], then: (resolve: (v: unknown[]) => void) => resolve([]),
    }) }) }),
    insert: (table: unknown) => ({ values: () => {
      const name = table === events ? 'event' : 'seen';
      mocks.writes.push(name);
      if (name === 'event' && mocks.failEvent) throw new Error('DB unavailable');
      return { onConflictDoNothing: async () => {}, then: (resolve: () => void) => resolve() };
    } }),
  } };
});
import { articleHash, processNewsArticle } from './classify';
const person = { id: 1, name: 'Person', slug: 'person' };
const article = { title: 'Person gives climate speech', url: 'https://example.com/a', publishedAt: new Date('2026-06-01') };
const classification = { relevant: true, kind: 'positive', type: 'speech', confidence: 0.9,
  title: 'Climate speech', summary: 'Spoke about climate', eventDate: '2026-06-01' };
beforeEach(() => {
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
  vi.stubEnv('OLLAMA_MODEL', '');
  mocks.failEvent = false;
  mocks.existing = false;
  mocks.writes.length = 0;
  mocks.generateObject.mockReset().mockResolvedValue({ object: classification });
});
describe('news persistence', () => {
  it('does not classify an already processed source', async () => {
    mocks.existing = true;
    expect(await processNewsArticle(person, article)).toBe('seen');
    expect(mocks.generateObject).not.toHaveBeenCalled();
    expect(mocks.writes).toEqual(['seen']);
  });
  it('deduplicates per person, not globally', () => {
    expect(articleHash(1, article.url)).not.toBe(articleHash(2, article.url));
  });
  it('marks a relevant article seen only after storing the event', async () => {
    expect(await processNewsArticle(person, article)).toBe('stored');
    expect(mocks.writes).toEqual(['event', 'seen']);
  });
  it('keeps a failed event write retryable', async () => {
    mocks.failEvent = true;
    expect(await processNewsArticle(person, article)).toBe('storageErrors');
    expect(mocks.writes).toEqual(['event']);
  });
  it('consumes successfully classified irrelevant articles without creating events', async () => {
    mocks.generateObject.mockResolvedValue({ object: { ...classification, relevant: false } });
    expect(await processNewsArticle(person, article)).toBe('rejected');
    expect(mocks.writes).toEqual(['seen']);
  });
});
