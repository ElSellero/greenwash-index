import type { PersonDetail } from '@/lib/api-types';
import { formatScore } from '@/lib/format';

export const ScoreBreakdown = ({ snapshot }: { snapshot: NonNullable<PersonDetail['snapshot']> }) => {
  const t12 = snapshot.co2Kg12m / 1000;
  const tAll = snapshot.co2KgTotal / 1000;
  const allTimeScore = tAll * snapshot.multiplier;
  const mult = snapshot.multiplier.toFixed(2);
  return (
    <div className="rounded-xl border border-panel-edge bg-panel p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-dim">Hypocrisy Score — full math, no magic</p>
      <dl className="mt-3 space-y-2 font-[family-name:var(--font-mono-num)] tabular-nums">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <dt className="text-[10px] uppercase tracking-[0.15em] text-dim">All-time</dt>
          <dd className="text-base">
            <span className="text-neg">{tAll.toFixed(1)} t</span>
            <span className="text-dim"> × </span><span className="text-pos">{mult}</span>
            <span className="text-dim"> = </span><span className="font-semibold text-white">{formatScore(allTimeScore)}</span>
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <dt className="text-[10px] uppercase tracking-[0.15em] text-dim">Last 12 months</dt>
          <dd className="text-base">
            <span className="text-neg">{t12.toFixed(1)} t</span>
            <span className="text-dim"> × </span><span className="text-pos">{mult}</span>
            <span className="text-dim"> = </span><span className="font-semibold text-white">{formatScore(snapshot.score)}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-dim">
        Documented CO2 (tonnes) × advocacy multiplier (1–10, decaying over 24 months). The
        <b className="text-slate-300"> all-time</b> score counts every documented tonne (incl. cited historical
        reports); the <b className="text-slate-300">12-month</b> score is the rolling window of recent tracked
        emissions. <a href="/methodology" className="text-accent hover:underline">Methodology</a> — a satirical
        editorial assessment based on the sourced events below.
      </p>
    </div>
  );
};
