import type { PersonDetail } from '@/lib/api-types';
import { formatScore } from '@/lib/format';

export const ScoreBreakdown = ({ snapshot }: { snapshot: NonNullable<PersonDetail['snapshot']> }) => (
  <div className="rounded-xl border border-panel-edge bg-panel p-4">
    <p className="text-[10px] uppercase tracking-[0.2em] text-dim">Hypocrisy Score — full math, no magic</p>
    <p className="mt-2 font-[family-name:var(--font-mono-num)] text-lg">
      <span className="text-neg">{(snapshot.co2Kg12m / 1000).toFixed(1)} t CO2</span>
      <span className="text-dim"> × </span>
      <span className="text-pos">{snapshot.multiplier.toFixed(2)}</span>
      <span className="text-dim"> = </span>
      <span className="text-white">{formatScore(snapshot.score)}</span>
    </p>
    <p className="mt-1 text-xs text-dim">
      Emissions (rolling 12 months, vehicles only) × advocacy multiplier (1–10, decaying over 24 months).{' '}
      <a href="/methodology" className="text-accent hover:underline">Methodology</a> — this score is a
      satirical editorial assessment based on the sourced events below.
    </p>
  </div>
);
