import { describe, expect, it } from 'vitest';
import { advocacyMultiplier, hypocrisyScore, rankPersons, stanceScore } from '@/lib/score/hypocrisy';

const NOW = new Date('2026-06-10T00:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

describe('advocacyMultiplier', () => {
  it('is 1 with no advocacy (the silent emitter)', () => {
    expect(advocacyMultiplier([], NOW)).toBe(1);
  });
  it('adds full weight for a fresh event', () => {
    expect(advocacyMultiplier([{ weight: 5, occurredAt: NOW }], NOW)).toBeCloseTo(6, 5);
  });
  it('halves weight after one half-life (730 days)', () => {
    expect(advocacyMultiplier([{ weight: 4, occurredAt: daysAgo(730) }], NOW)).toBeCloseTo(3, 2);
  });
  it('caps at 10', () => {
    const spam = Array.from({ length: 100 }, () => ({ weight: 5, occurredAt: NOW }));
    expect(advocacyMultiplier(spam, NOW)).toBe(10);
  });
});

describe('hypocrisyScore', () => {
  it('preacher outranks silent emitter at equal CO2', () => {
    const silent = hypocrisyScore(3000, advocacyMultiplier([], NOW));
    const preacher = hypocrisyScore(
      3000,
      advocacyMultiplier([{ weight: 5, occurredAt: NOW }], NOW),
    );
    expect(preacher).toBeGreaterThan(silent);
    expect(silent).toBe(3000);
  });
});

describe('stanceScore (rhetoric floor)', () => {
  it('is 0 with no documented acts, however loud the advocacy', () => {
    // a pure climate advocate (high multiplier, zero dirty deeds) is NOT a hypocrite
    expect(stanceScore([], 10, NOW)).toBe(0);
  });
  it('scores documented unquantified acts, amplified by the multiplier', () => {
    const quiet = stanceScore([{ points: 1.5, occurredAt: NOW }], 1, NOW);
    const loud = stanceScore([{ points: 1.5, occurredAt: NOW }], 10, NOW);
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeCloseTo(quiet * 10, 5); // talk × deeds
  });
  it('decays an act by half after one half-life', () => {
    const fresh = stanceScore([{ points: 1.5, occurredAt: NOW }], 2, NOW);
    const aged = stanceScore([{ points: 1.5, occurredAt: daysAgo(730) }], 2, NOW);
    expect(aged).toBeCloseTo(fresh / 2, 5);
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
