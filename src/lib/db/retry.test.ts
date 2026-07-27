import { afterEach, describe, expect, it, vi } from 'vitest';
import { isTransientDbError, withDbRetry } from '@/lib/db/retry';

/** The shape Neon/Drizzle actually throws: the network cause is two levels down. */
const neonFetchFailure = () => {
  const drizzle = new Error('Failed query: select "id" from "vehicles" where ...');
  drizzle.cause = Object.assign(
    new Error('Error connecting to database: TypeError: fetch failed'),
    { sourceError: new TypeError('fetch failed') },
  );
  return drizzle;
};

afterEach(() => vi.restoreAllMocks());

describe('isTransientDbError', () => {
  it('detects a network failure nested in the cause chain', () => {
    expect(isTransientDbError(neonFetchFailure())).toBe(true);
  });
  it('detects node socket error codes and AggregateError members', () => {
    expect(isTransientDbError(Object.assign(new Error('boom'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isTransientDbError(new AggregateError([new TypeError('fetch failed')]))).toBe(true);
  });
  it('leaves real SQL errors alone', () => {
    expect(isTransientDbError(new Error('column "nope" does not exist'))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
  });
  it('survives a self-referencing cause chain', () => {
    const err = new Error('weird');
    err.cause = err;
    expect(isTransientDbError(err)).toBe(false);
  });
});

describe('withDbRetry', () => {
  it('returns the first successful read without retrying', async () => {
    const read = vi.fn().mockResolvedValue(['row']);
    await expect(withDbRetry(read, 'vehicles', { baseDelayMs: 0 })).resolves.toEqual(['row']);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('retries a transient failure and succeeds', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const read = vi.fn()
      .mockRejectedValueOnce(neonFetchFailure())
      .mockResolvedValue(['row']);
    await expect(withDbRetry(read, 'vehicles', { baseDelayMs: 0 })).resolves.toEqual(['row']);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('gives up after the attempt budget and rethrows the last error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const read = vi.fn().mockRejectedValue(neonFetchFailure());
    await expect(withDbRetry(read, 'vehicles', { attempts: 3, baseDelayMs: 0 })).rejects.toThrow(/Failed query/);
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('does not retry a non-transient error', async () => {
    const read = vi.fn().mockRejectedValue(new Error('column "nope" does not exist'));
    await expect(withDbRetry(read, 'vehicles', { baseDelayMs: 0 })).rejects.toThrow(/does not exist/);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
