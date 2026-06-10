import { CONFIG } from '@/config';

export type AdvocacyEvent = { weight: number; occurredAt: Date };

/**
 * multiplier = 1 + min(cap-1, Σ weight × 0.5^(ageDays / halfLife))
 * Documented verbatim on /methodology — keep code and page in sync.
 */
export const advocacyMultiplier = (events: AdvocacyEvent[], now: Date): number => {
  const { halfLifeDays, multiplierCap } = CONFIG.score;
  const sum = events.reduce((acc, e) => {
    const ageDays = Math.max(0, (now.getTime() - e.occurredAt.getTime()) / 86_400_000);
    return acc + e.weight * Math.pow(0.5, ageDays / halfLifeDays);
  }, 0);
  return 1 + Math.min(multiplierCap - 1, sum);
};

export const hypocrisyScore = (co2Tons12m: number, multiplier: number): number =>
  co2Tons12m * multiplier;

export const rankPersons = <T extends { score: number }>(
  rows: T[],
): (T & { rank: number })[] =>
  [...rows]
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }));
