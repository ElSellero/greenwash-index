import { describe, expect, it } from 'vitest';
import { formatCo2Kg, formatScore, plainHyphens } from '@/lib/format';

describe('formatCo2Kg', () => {
  it('formats tons above 1000 kg', () => expect(formatCo2Kg(1_234_500)).toBe('1,234.5 t'));
  it('formats kg below 1000', () => expect(formatCo2Kg(420)).toBe('420 kg'));
});
describe('formatScore', () => {
  it('rounds to integer with separators', () => expect(formatScore(15040.7)).toBe('15,041'));
});

describe('plainHyphens', () => {
  it('turns spaced em dashes into spaced hyphens', () => {
    expect(plainHyphens('Yacht trip \u2014 1654 km (M/Y Symphony)')).toBe('Yacht trip - 1654 km (M/Y Symphony)');
  });
  it('turns unspaced em dashes into plain hyphens', () => {
    expect(plainHyphens('2019\u20142021')).toBe('2019-2021');
  });
  it('leaves text without em dashes untouched', () => {
    expect(plainHyphens('Gulfstream G650 – 7.3 t')).toBe('Gulfstream G650 – 7.3 t');
  });
});
