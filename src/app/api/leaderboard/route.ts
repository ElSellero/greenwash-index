import { NextResponse } from 'next/server';
import { getLeaderboard, getRecentEvents } from '@/lib/db/queries';
import { CONFIG } from '@/config';

export const GET = async () => {
  const [leaderboard, recentEvents] = await Promise.all([getLeaderboard(), getRecentEvents(20)]);
  return NextResponse.json(
    { leaderboard, recentEvents, generatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': `public, s-maxage=${CONFIG.cache.leaderboardSMaxAge}, stale-while-revalidate=${CONFIG.cache.staleWhileRevalidate}` } },
  );
};
