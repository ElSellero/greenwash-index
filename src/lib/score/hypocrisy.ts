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

export type StanceEvent = { points: number; occurredAt: Date };

/**
 * "Rhetoric floor" for figures with documented high-emission ACTS we couldn't put
 * a CO2 number on (a reported jet, yacht or mansion with no tonnage). Each such act
 * is time-decayed, summed, then AMPLIFIED by the advocacy multiplier — green talk ×
 * dirty deeds is the whole point of a hypocrisy index. Hard-capped so it never rivals
 * real tracked CO2.
 *
 * Crucially it is driven ONLY by documented acts: positive advocacy never produces a
 * floor on its own. A consistent climate advocate with no documented high-emission act
 * has an empty `acts` list ⇒ score 0 — they're consistent, not a hypocrite.
 */
export const stanceScore = (acts: StanceEvent[], multiplier: number, now: Date): number => {
  const { halfLifeDays, stanceScale, stanceCap } = CONFIG.score;
  const sum = acts.reduce((acc, e) => {
    const ageDays = Math.max(0, (now.getTime() - e.occurredAt.getTime()) / 86_400_000);
    return acc + e.points * Math.pow(0.5, ageDays / halfLifeDays);
  }, 0);
  return Math.min(stanceCap, stanceScale * multiplier * sum);
};

export const rankPersons = <T extends { score: number }>(
  rows: T[],
): (T & { rank: number })[] =>
  [...rows]
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }));
