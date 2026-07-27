/**
 * Transient-failure retry for idempotent database reads.
 *
 * Neon's HTTP driver surfaces network hiccups (DNS, TLS, socket resets) as a
 * `TypeError: fetch failed` buried in the `cause` chain of a DrizzleQueryError.
 * One of those on a scheduled job's opening SELECT used to abort the entire run
 * (ais-sample, 2026-07-27) even though the runs either side connected fine.
 *
 * Only connection-level failures are retried — a real SQL error (bad column,
 * constraint violation) still fails immediately. Deliberately scoped to reads:
 * `fetch failed` can also mean "response lost after the server ran the query",
 * so retrying a write could duplicate it.
 */

/** Connection-level failure signatures, matched against message and code. */
const TRANSIENT =
  /fetch failed|error connecting to database|socket hang up|terminated|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE|UND_ERR/i;

/** Walks the `cause` chain (and AggregateError members) looking for a network failure. */
export const isTransientDbError = (err: unknown): boolean => {
  const seen = new Set<unknown>();
  let cur: unknown = err;
  while (cur && typeof cur === 'object' && !seen.has(cur)) {
    seen.add(cur);
    const e = cur as { message?: unknown; code?: unknown; cause?: unknown; errors?: unknown };
    if (typeof e.message === 'string' && TRANSIENT.test(e.message)) return true;
    if (typeof e.code === 'string' && TRANSIENT.test(e.code)) return true;
    if (Array.isArray(e.errors) && e.errors.some(isTransientDbError)) return true;
    cur = e.cause;
  }
  return false;
};

type RetryOpts = { attempts?: number; baseDelayMs?: number };

/**
 * Runs `read` and retries it on a transient connection failure with linear
 * backoff. `label` only shows up in the retry log line.
 */
export const withDbRetry = async <T>(
  read: () => Promise<T>,
  label = 'query',
  { attempts = 3, baseDelayMs = 1_000 }: RetryOpts = {},
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read();
    } catch (err) {
      if (attempt >= attempts || !isTransientDbError(err)) throw err;
      const wait = attempt * baseDelayMs;
      const reason = (err instanceof Error ? err.message : String(err)).split('\n')[0]?.slice(0, 120);
      console.warn(`db ${label}: transient failure ${attempt}/${attempts}, retrying in ${wait}ms — ${reason}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
};
