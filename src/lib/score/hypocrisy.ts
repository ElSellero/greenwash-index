import { CONFIG } from '@/config';

export type AdvocacyEvent = { weight: number };

/**
 * multiplier = 1 + min(cap-1, Σ weight)
 * Lifetime advocacy, NO time decay — the 12-month vs all-time split is carried
 * entirely by the CO2 window, so dampening this too would just double-count time.
 * Documented verbatim on /methodology — keep code and page in sync.
 */
export const advocacyMultiplier = (events: AdvocacyEvent[]): number => {
  const { multiplierCap } = CONFIG.score;
  const sum = events.reduce((acc, e) => acc + e.weight, 0);
  return 1 + Math.min(multiplierCap - 1, sum);
};

export const hypocrisyScore = (co2Tons12m: number, multiplier: number): number =>
  co2Tons12m * multiplier;

export type StanceEvent = { points: number };

/**
 * "Rhetoric floor" for figures with documented high-emission ACTS we couldn't put
 * a CO2 number on (a reported jet, yacht or mansion with no tonnage). Each such act
 * is summed, then AMPLIFIED by the advocacy multiplier — green talk × dirty deeds is
 * the whole point of a hypocrisy index. Hard-capped so it never rivals real tracked
 * CO2. NO time decay: a documented high-emission lifestyle is a persistent trait, and
 * recency is already expressed by the CO2 window, not here.
 *
 * Crucially it is driven ONLY by documented acts: positive advocacy never produces a
 * floor on its own. A consistent climate advocate with no documented high-emission act
 * has an empty `acts` list ⇒ score 0 — they're consistent, not a hypocrite.
 */
export const stanceScore = (acts: StanceEvent[], multiplier: number): number => {
  const { stanceScale, stanceCap } = CONFIG.score;
  const sum = acts.reduce((acc, e) => acc + e.points, 0);
  return Math.min(stanceCap, stanceScale * multiplier * sum);
};

/**
 * All-time hypocrisy score: lifetime documented CO2 (tonnes) × advocacy multiplier
 * + rhetoric floor. The leaderboard's "All-time" window, the person page's all-time
 * rank, and the info popup all rank by THIS — keep them on one definition.
 */
export const allTimeScore = (
  e: { co2KgTotal: number; multiplier: number; stanceScore: number },
): number => (e.co2KgTotal / 1000) * e.multiplier + e.stanceScore;

export const rankPersons = <T extends { score: number }>(
  rows: T[],
): (T & { rank: number })[] =>
  [...rows]
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }));
