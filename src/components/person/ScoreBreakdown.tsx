import type { PersonDetail } from '@/lib/api-types';
import { formatScore } from '@/lib/format';

export const ScoreBreakdown = ({ snapshot }: { snapshot: NonNullable<PersonDetail['snapshot']> }) => {
  const t12 = snapshot.co2Kg12m / 1000;
  const tAll = snapshot.co2KgTotal / 1000;
  const mult = snapshot.multiplier.toFixed(2);
  const stance = snapshot.stanceScore;
  const stanceStr = stance >= 1 ? ` + ${formatScore(stance)}` : '';
  const allTimeScore = (snapshot.co2KgTotal / 1000) * snapshot.multiplier + stance;
  return (
    <div className="rounded-xl border border-panel-edge bg-panel p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-dim">Hypocrisy Score — full math, no magic</p>
      <dl className="mt-3 space-y-2 font-[family-name:var(--font-mono-num)] tabular-nums">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <dt className="text-[10px] uppercase tracking-[0.15em] text-dim">All-time</dt>
          <dd className="text-base">
            <span className="text-neg">{tAll.toFixed(1)} t</span>
            <span className="text-dim"> × </span><span className="text-pos">{mult}</span>
            {stanceStr && <span className="text-accent">{stanceStr}</span>}
            <span className="text-dim"> = </span><span className="font-semibold text-white">{formatScore(allTimeScore)}</span>
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <dt className="text-[10px] uppercase tracking-[0.15em] text-dim">Last 12 months</dt>
          <dd className="text-base">
            <span className="text-neg">{t12.toFixed(1)} t</span>
            <span className="text-dim"> × </span><span className="text-pos">{mult}</span>
            {stanceStr && <span className="text-accent">{stanceStr}</span>}
            <span className="text-dim"> = </span><span className="font-semibold text-white">{formatScore(snapshot.score)}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-dim">
        Documented CO2 (tonnes) × advocacy multiplier (1–10, decaying over 24 months). A small
        <b className="text-slate-300"> rhetoric floor </b> adds documented but unquantified high-emission acts
        (a reported jet, yacht or mansion), amplified by that multiplier — so green-talk-plus-untracked-exhaust
        isn&apos;t a flat zero. <b className="text-slate-300">Advocacy alone never scores</b>: a consistent climate
        advocate with no such act stays at zero. <b className="text-slate-300">All-time</b> counts every documented
        tonne (incl. cited reports); <b className="text-slate-300">12-month</b> is the rolling window.
        <a href="/methodology" className="text-accent hover:underline"> Methodology</a>.
      </p>
    </div>
  );
};
