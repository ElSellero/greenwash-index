import { describe, expect, it } from 'vitest';
import { tripCo2Kg, co2RatePerSecond, JET_MODEL_KG_PER_KM } from '@/lib/score/co2';

describe('tripCo2Kg', () => {
  it('multiplies distance by the vehicle factor', () => {
    expect(tripCo2Kg(1000, 4.9)).toBe(4900);
  });
  it('never returns negative', () => {
    expect(tripCo2Kg(-5, 4.9)).toBe(0);
  });
});

describe('co2RatePerSecond', () => {
  it('spreads last-24h kg over 86400s', () => {
    expect(co2RatePerSecond(8640)).toBeCloseTo(0.1, 5);
  });
});

describe('JET_MODEL_KG_PER_KM', () => {
  it('has a plausible G650 factor', () => {
    expect(JET_MODEL_KG_PER_KM['gulfstream-g650']).toBeGreaterThan(3);
  });
});
