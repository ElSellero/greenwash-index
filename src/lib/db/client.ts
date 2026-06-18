import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type DB = NeonHttpDatabase<typeof schema>;

let cached: DB | undefined;
const real = (): DB => {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    cached = drizzle(neon(url), { schema });
  }
  return cached;
};

/**
 * Lazy proxy: `neon()` is only constructed on first real use (request time),
 * so importing this module never throws at build when DATABASE_URL is absent
 * (e.g. dependency-bump preview builds). Query-time errors still surface and
 * are handled by callers that run during prerender.
 */
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const target = real() as unknown as Record<string | symbol, unknown>;
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
