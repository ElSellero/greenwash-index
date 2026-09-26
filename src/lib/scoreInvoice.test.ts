import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '@/lib/api-types';
import { allTimeScore } from '@/lib/score/hypocrisy';
import { scoreInvoice, type InvoiceLine } from '@/lib/scoreInvoice';

const entry = (over: Partial<LeaderboardEntry>): LeaderboardEntry => ({
  personId: 1, slug: 'eric-schmidt', name: 'Eric Schmidt', category: 'tech', imageUrl: null,
  co2Kg12m: 4_000_000, co2KgTotal: 16_418_200, multiplier: 9, stanceScore: 0, score: 36_000, rank: 1,
  co2RatePerSec: 0, snapshotDate: '2026-09-26',
  vehicles: [{ type: 'jet', name: 'Gulfstream G650' }, { type: 'yacht', name: 'M/Y Whisper' }],
  jetCo2Kg12m: 1_000_000, jetCo2KgTotal: 7_287_000, yachtCo2Kg12m: 3_000_000, yachtCo2KgTotal: 9_131_200,
  ...over,
});

const co2Kg = (lines: InvoiceLine[]) =>
  lines.reduce((sum, l) => sum + (l.kind === 'vehicle' || l.kind === 'other' ? l.co2Kg : 0), 0);
const total = (lines: InvoiceLine[]) => lines.find((l) => l.kind === 'total')!;
const recompute = (lines: InvoiceLine[]) => {
  const m = lines.find((l) => l.kind === 'multiplier');
  const r = lines.find((l) => l.kind === 'rhetoric');
  return (co2Kg(lines) / 1000) * (m?.kind === 'multiplier' ? m.value : 1) + (r?.kind === 'rhetoric' ? r.points : 0);
};

describe('scoreInvoice', () => {
  it('itemises jet and yacht, then multiplies into the all-time score', () => {
    const e = entry({});
    const lines = scoreInvoice(e, 'all');
    expect(lines.map((l) => l.kind)).toEqual(['vehicle', 'vehicle', 'multiplier', 'total']);
    expect(lines[0]).toEqual({ kind: 'vehicle', type: 'jet', label: 'Gulfstream G650', co2Kg: 7_287_000 });
    expect(lines[1]).toEqual({ kind: 'vehicle', type: 'yacht', label: 'M/Y Whisper', co2Kg: 9_131_200 });
    expect(total(lines)).toEqual({ kind: 'total', score: allTimeScore(e) });
  });

  it('uses the 12-month figures and stored score in the 12-month window', () => {
    const lines = scoreInvoice(entry({}), '12m');
    expect(co2Kg(lines)).toBe(4_000_000);
    expect(total(lines)).toEqual({ kind: 'total', score: 36_000 });
  });

  it('adds the rhetoric floor when it contributes', () => {
    const e = entry({ stanceScore: 247.5 });
    const lines = scoreInvoice(e, 'all');
    expect(lines).toContainEqual({ kind: 'rhetoric', points: 247.5 });
    expect(recompute(lines)).toBeCloseTo(allTimeScore(e), 6);
  });

  it('adds up to the score even when CO2 comes from outside the named fleet', () => {
    const e = entry({ co2KgTotal: 17_000_000, stanceScore: 12 });
    const lines = scoreInvoice(e, 'all');
    expect(lines).toContainEqual({ kind: 'other', co2Kg: 17_000_000 - 7_287_000 - 9_131_200 });
    expect(recompute(lines)).toBeCloseTo(allTimeScore(e), 6);
  });

  it('keeps an unnamed line for jet emissions when no jet is on file', () => {
    const lines = scoreInvoice(entry({ vehicles: [{ type: 'yacht', name: 'M/Y Whisper' }] }), 'all');
    expect(lines[0]).toEqual({ kind: 'vehicle', type: 'jet', label: 'Private jet', co2Kg: 7_287_000 });
  });

  it('omits a vehicle type the person neither owns nor emitted with', () => {
    const lines = scoreInvoice(entry({
      vehicles: [{ type: 'jet', name: 'Gulfstream G650' }], yachtCo2KgTotal: 0, co2KgTotal: 7_287_000,
    }), 'all');
    expect(lines.filter((l) => l.kind === 'vehicle')).toHaveLength(1);
  });
});
