import { getCurrentPositions, getLeaderboard, getRecentEvents } from '@/lib/db/queries';
import { HomeClient } from '@/components/HomeClient';

export const revalidate = 300;

const HomePage = async () => {
  const [leaderboard, recentEvents, positions] = await Promise.all([
    getLeaderboard(), getRecentEvents(20), getCurrentPositions(),
  ]);
  return (
    <HomeClient initial={{
      board: { leaderboard, recentEvents, generatedAt: new Date().toISOString() },
      positions,
    }} />
  );
};

export default HomePage;
