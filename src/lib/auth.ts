import { timingSafeEqual } from 'node:crypto';

/** Constant-time check of "Bearer <INGEST_SECRET>" — never compare secrets with ===. */
export const isAuthorized = (authHeader: string | null): boolean => {
  const secret = process.env.INGEST_SECRET;
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader);
  return expected.length === received.length && timingSafeEqual(expected, received);
};
