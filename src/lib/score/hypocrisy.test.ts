import { describe, expect, it } from 'vitest';
import { advocacyMultiplier, hypocrisyScore, rankPersons, stanceScore } from '@/lib/score/hypocrisy';

describe('advocacyMultiplier', () => {
  it('is 1 with no advocacy (the silent emitter)', () => {
    expect(advocacyMultiplier([])).toBe(1);
  });
  it('adds full weight, with no time decay', () => {
    expect(advocacyMultiplier([{ weight: 5 }])).toBe(6);
  });
  it('caps at 10', () => {
    const spam = Array.from({ length: 100 }, () => ({ weight: 5 }));
    expect(advocacyMultiplier(spam)).toBe(10);
  });
});

describe('hypocrisyScore', () => {
  it('preacher outranks silent emitter at equal CO2', () => {
    const silent = hypocrisyScore(3000, advocacyMultiplier([]));
    const preacher = hypocrisyScore(3000, advocacyMultiplier([{ weight: 5 }]));
    expect(preacher).toBeGreaterThan(silent);
    expect(silent).toBe(3000);
  });
});

describe('stanceScore (rhetoric floor)', () => {
  it('is 0 with no documented acts, however loud the advocacy', () => {
    // a pure climate advocate (high multiplier, zero dirty deeds) is NOT a hypocrite
    expect(stanceScore([], 10)).toBe(0);
  });
  it('scores documented unquantified acts, amplified by the multiplier', () => {
    const quiet = stanceScore([{ points: 1.5 }], 1);
    const loud = stanceScore([{ points: 1.5 }], 10);
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeCloseTo(quiet * 10, 5); // talk × deeds
  });
  it('does not decay with age — a documented act counts the same whenever it happened', () => {
    expect(stanceScore([{ points: 1.5 }], 2)).toBe(stanceScore([{ points: 1.5 }], 2));
  });
});

describe('rankPersons', () => {
  it('sorts descending by score, rank starts at 1', () => {
    const ranked = rankPersons([
      { personId: 1, score: 10 },
      { personId: 2, score: 99 },
      { personId: 3, score: 50 },
    ]);
    expect(ranked.map((r) => r.personId)).toEqual([2, 3, 1]);
    expect(ranked[0]!.rank).toBe(1);
  });
});
