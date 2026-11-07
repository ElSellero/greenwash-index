import { describe, expect, it } from 'vitest';
import { scanOrder, scanPersons, type ScanPerson } from './scan';

const persons: ScanPerson[] = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}`, slug: `${i + 1}` }));
const article = { title: 'Climate speech', url: 'https://example.com/a', publishedAt: new Date() };

describe('news scheduling', () => {
  it('resumes after the saved person and wraps deterministically', () => {
    expect(scanOrder(persons, 48).slice(0, 4).map(p => p.id)).toEqual([49, 50, 1, 2]);
  });
  it('visits all 50 people across capped runs even when every classification fails', async () => {
    let cursor = 0;
    const visited: number[] = [];
    for (let i = 0; i < 2; i++) {
      const result = await scanPersons({ persons, lastId: cursor, cap: 25, deadline: Infinity, perPerson: 3,
        checkpoint: async id => { cursor = id; visited.push(id); },
        fetch: async () => ({ articles: [article], sourcesOk: 1, errors: [] }),
        process: async () => 'classificationErrors',
      });
      expect(result.classificationErrors).toBe(25);
    }
    expect(new Set(visited).size).toBe(50);
  });
  it('limits prolific people and does not spend the cap on already-seen stories', async () => {
    const result = await scanPersons({ persons: persons.slice(0, 2), lastId: 0, cap: 4, deadline: Infinity, perPerson: 2,
      checkpoint: async () => {}, fetch: async () => ({ articles: [article, article, article, article], sourcesOk: 2, errors: [] }),
      process: async p => p.id === 1 ? 'seen' : 'stored',
    });
    expect(result).toMatchObject({ persons: 2, seen: 4, stored: 2, attempted: 2 });
  });
  it('checkpoints empty/failed feeds and reports their failures', async () => {
    const checkpoints: number[] = [];
    const result = await scanPersons({ persons: persons.slice(0, 2), lastId: 0, cap: 25, deadline: Infinity, perPerson: 3,
      checkpoint: async id => { checkpoints.push(id); },
      fetch: async () => ({ articles: [], sourcesOk: 0, errors: ['google: timeout', 'gdelt: HTTP 429'] }),
      process: async () => { throw new Error('should not classify'); },
    });
    expect(checkpoints).toEqual([1, 2]);
    expect(result).toMatchObject({ sourceErrors: 4, sourcesOk: 0, attempted: 0 });
  });
  it('stops before starting work that cannot fit the remaining time', async () => {
    const result = await scanPersons({ persons, lastId: 0, cap: 25, deadline: 1000, perPerson: 3, now: () => 0,
      checkpoint: async () => { throw new Error('should not start'); },
      fetch: async () => ({ articles: [], sourcesOk: 0, errors: [] }), process: async () => 'stored',
    });
    expect(result).toMatchObject({ stopped: 'budget', persons: 0 });
  });
});
