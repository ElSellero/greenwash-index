import { parseTileRequest, tileSourceUrl } from '@/lib/globe/tiles';

const UPSTREAM_TIMEOUT_MS = 10_000;
/** Imagery never changes; the CDN keeps a tile for a year so NASA is asked at most once per edge. */
const CACHE_FOREVER = 'public, max-age=604800, s-maxage=31536000, immutable';

const failure = (status: number, message: string) =>
  new Response(message, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Same-origin proxy for NASA GIBS imagery tiles: visitors' browsers never contact NASA,
 * and only in-range tiles of the two known layers can be requested.
 */
export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ layer: string; z: string; row: string; col: string }> },
) => {
  const { layer, z, row, col } = await params;
  const tile = parseTileRequest(layer, z, row, col);
  if (!tile) return failure(404, 'Unknown tile');

  const url = tileSourceUrl(tile);
  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), cache: 'no-store' });
    const type = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !type.startsWith('image/jpeg')) {
      console.warn(`[tiles] ${url} answered ${upstream.status} ${type}`);
      return failure(502, 'Imagery unavailable');
    }
    return new Response(upstream.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': CACHE_FOREVER } });
  } catch (err) {
    console.warn(`[tiles] ${url} failed:`, err);
    return failure(502, 'Imagery unavailable');
  }
};
