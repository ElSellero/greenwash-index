import { describe, expect, it } from 'vitest';
import { personNameQuery } from '@/lib/ingest/personSearch';

describe('personNameQuery', () => {
  it('quotes a plain display name (the common case)', () => {
    expect(personNameQuery('elon-musk', 'Elon Musk')).toBe('"Elon Musk"');
  });

  it('falls back to the name alone for an unknown slug', () => {
    expect(personNameQuery('nobody', 'Some One')).toBe('"Some One"');
  });

  it('ORs in aliases for a poorly-matching titled name', () => {
    expect(personNameQuery('sultan-of-brunei', 'Hassanal Bolkiah, Sultan of Brunei')).toBe(
      '("Hassanal Bolkiah, Sultan of Brunei" OR "Hassanal Bolkiah" OR "Sultan of Brunei")',
    );
  });

  it('quotes every aliased phrase', () => {
    const q = personNameQuery('prince-albert-ii', 'Prince Albert II of Monaco');
    expect(q.startsWith('(') && q.endsWith(')')).toBe(true);
    expect(q).toContain('"Prince Albert of Monaco"');
    expect(q).toContain('"Albert II of Monaco"');
  });

  it('does not repeat a phrase when an alias equals the display name', () => {
    // guard the Set-dedupe: same phrase must never appear twice in the clause
    const q = personNameQuery('sultan-of-brunei', 'Sultan of Brunei');
    expect(q.match(/"Sultan of Brunei"/g)).toHaveLength(1);
  });
});
