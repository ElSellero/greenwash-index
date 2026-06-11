import { describe, expect, it } from 'vitest';
import { formatCo2Kg, formatScore } from '@/lib/format';

describe('formatCo2Kg', () => {
  it('formats tons above 1000 kg', () => expect(formatCo2Kg(1_234_500)).toBe('1,234.5 t'));
  it('formats kg below 1000', () => expect(formatCo2Kg(420)).toBe('420 kg'));
});
describe('formatScore', () => {
  it('rounds to integer with separators', () => expect(formatScore(15040.7)).toBe('15,041'));
});
