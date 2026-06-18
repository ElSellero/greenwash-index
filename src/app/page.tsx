import { getCurrentPositions, getLeaderboard, getRecentEvents } from '@/lib/db/queries';
import { HomeClient } from '@/components/HomeClient';

export const revalidate = 300;

// Tolerate a missing DB at prerender (e.g. preview builds without DATABASE_URL):
// fall back to empty so the build succeeds; ISR fills real data at runtime.
const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
  try { return await p; } catch { return fallback; }
};

const HomePage = async () => {
  const [leaderboard, recentEvents, positions] = await Promise.all([
    safe(getLeaderboard(), [] as Awaited<ReturnType<typeof getLeaderboard>>),
    safe(getRecentEvents(20), [] as Awaited<ReturnType<typeof getRecentEvents>>),
    safe(getCurrentPositions(), { positions: [], activeTrips: [] } as Awaited<ReturnType<typeof getCurrentPositions>>),
  ]);
  return (
    <HomeClient initial={{
      board: { leaderboard, recentEvents, generatedAt: new Date().toISOString() },
      positions,
    }} />
  );
};

export default HomePage;
