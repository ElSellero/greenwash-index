import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
const mocks = vi.hoisted(() => ({ execute: vi.fn(), select: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/db/client', () => ({ db: { execute: mocks.execute, select: () => ({ from: mocks.select }) } }));
vi.mock('./news', () => ({ fetchArticlesFor: mocks.fetch }));
import { runNewsScan } from './classify';
const dialect = new PgDialect();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.execute.mockResolvedValue({ rows: [] });
  mocks.select.mockResolvedValue([{ id: 1, name: 'One', slug: 'one' }, { id: 2, name: 'Two', slug: 'two' }]);
  mocks.fetch.mockResolvedValue({ articles: [], sourcesOk: 2, errors: [] });
});
it('does no news work while another run holds the lease', async () => {
  expect(await runNewsScan()).toEqual({ status: 'busy' });
  expect(mocks.select).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('uses the persisted cursor, checkpoints progress and releases its lease', async () => {
  mocks.execute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ last_person_id: 1 }] });
  const result = await runNewsScan();
  expect(result).toMatchObject({ status: 'ok', persons: 2 });
  expect(mocks.fetch.mock.calls.map(c => c[0])).toEqual(['two', 'one']);
  const queries = mocks.execute.mock.calls.map(c => dialect.sqlToQuery(c[0]));
  expect(queries[3]!.params[0]).toBe(2);
  expect(queries[4]!.params[0]).toBe(1);
  expect(queries.at(-1)!.sql).toContain('lease_owner = null');
  expect(queries.at(-1)!.params[0]).toBe(queries[2]!.params[0]);
});
it('releases its lease even if reading persons fails', async () => {
  mocks.execute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ last_person_id: 1 }] });
  mocks.select.mockRejectedValueOnce(new Error('database unavailable'));
  await expect(runNewsScan()).rejects.toThrow('database unavailable');
  expect(dialect.sqlToQuery(mocks.execute.mock.calls.at(-1)![0]).sql).toContain('lease_owner = null');
});
