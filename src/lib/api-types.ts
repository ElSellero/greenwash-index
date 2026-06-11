import type { getLeaderboard, getPersonDetail, getCurrentPositions, getRecentEvents } from '@/lib/db/queries';

export type LeaderboardEntry = Awaited<ReturnType<typeof getLeaderboard>>[number];
export type PersonDetail = NonNullable<Awaited<ReturnType<typeof getPersonDetail>>>;
export type PositionsPayload = Awaited<ReturnType<typeof getCurrentPositions>>;
export type RecentEvent = Awaited<ReturnType<typeof getRecentEvents>>[number];

export type LeaderboardPayload = {
  leaderboard: LeaderboardEntry[];
  recentEvents: RecentEvent[];
  generatedAt: string;
};
