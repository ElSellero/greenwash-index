import { NextResponse } from 'next/server';
import { getCurrentPositions } from '@/lib/db/queries';
import { CONFIG } from '@/config';

export const GET = async () => {
  const data = await getCurrentPositions();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': `public, s-maxage=${CONFIG.cache.positionsSMaxAge}, stale-while-revalidate=${CONFIG.cache.staleWhileRevalidate}` },
  });
};
