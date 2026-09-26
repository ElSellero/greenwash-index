import type { LeaderboardEntry } from '@/lib/api-types';
import { allTimeScore } from '@/lib/score/hypocrisy';

export type InvoiceLine =
  | { kind: 'vehicle'; type: 'jet' | 'yacht'; label: string; co2Kg: number }
  | { kind: 'other'; co2Kg: number }
  | { kind: 'multiplier'; value: number }
  | { kind: 'rhetoric'; points: number }
  | { kind: 'total'; score: number };

const ROUNDING_KG = 500;
const FALLBACK_LABEL = { jet: 'Private jet', yacht: 'Superyacht' } as const;

/** A person's hypocrisy score written out as a bill: CO2 per vehicle × multiplier (+ rhetoric floor) = score. */
export const scoreInvoice = (e: LeaderboardEntry, mode: '12m' | 'all'): InvoiceLine[] => {
  const all = mode === 'all';
  const co2 = { jet: all ? e.jetCo2KgTotal : e.jetCo2Kg12m, yacht: all ? e.yachtCo2KgTotal : e.yachtCo2Kg12m };
  const totalCo2 = all ? e.co2KgTotal : e.co2Kg12m;
  const lines: InvoiceLine[] = [];
  for (const type of ['jet', 'yacht'] as const) {
    const owned = e.vehicles.filter((v) => v.type === type).map((v) => v.name);
    if (owned.length === 0 && co2[type] <= 0) continue;
    lines.push({ kind: 'vehicle', type, label: owned.join(', ') || FALLBACK_LABEL[type], co2Kg: co2[type] });
  }
  const other = totalCo2 - co2.jet - co2.yacht;
  if (Math.abs(other) >= ROUNDING_KG) lines.push({ kind: 'other', co2Kg: other });
  lines.push({ kind: 'multiplier', value: e.multiplier });
  if (e.stanceScore > 0) lines.push({ kind: 'rhetoric', points: e.stanceScore });
  lines.push({ kind: 'total', score: all ? allTimeScore(e) : e.score });
  return lines;
};
