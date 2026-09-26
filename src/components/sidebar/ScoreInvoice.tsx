import type { LeaderboardEntry } from '@/lib/api-types';
import { formatCo2Kg, formatScore } from '@/lib/format';
import { scoreInvoice, type InvoiceLine } from '@/lib/scoreInvoice';
import { VehicleGlyph } from '@/components/ui/VehicleGlyph';

const Operator = ({ children }: { children: React.ReactNode }) => (
  <span aria-hidden className="w-3.5 shrink-0 text-center text-dim">{children}</span>
);

const Line = ({ line }: { line: InvoiceLine }) => {
  switch (line.kind) {
    case 'vehicle':
      return (
        <div className="flex items-center gap-1.5">
          <VehicleGlyph type={line.type} />
          <dt className="min-w-0 flex-1 truncate font-sans text-slate-300">{line.label}</dt>
          <dd className="text-neg">{line.co2Kg > 0 ? formatCo2Kg(line.co2Kg) : '—'}</dd>
        </div>
      );
    case 'other':
      return (
        <div className="flex items-center gap-1.5">
          <Operator>+</Operator>
          <dt className="min-w-0 flex-1 truncate font-sans text-slate-300">Other documented CO2</dt>
          <dd className="text-neg">{formatCo2Kg(line.co2Kg)}</dd>
        </div>
      );
    case 'multiplier':
      return (
        <div className="flex items-center gap-1.5">
          <Operator>×</Operator>
          <dt className="flex-1 font-sans text-dim">Hypocrisy multiplier</dt>
          <dd className="text-pos">×{line.value.toFixed(1)}</dd>
        </div>
      );
    case 'rhetoric':
      return (
        <div className="flex items-center gap-1.5" title="Documented acts without a CO2 figure, amplified by the multiplier — see methodology">
          <Operator>+</Operator>
          <dt className="flex-1 font-sans text-dim">Rhetoric floor</dt>
          <dd className="text-accent">+{formatScore(line.points)}</dd>
        </div>
      );
    case 'total':
      return (
        <div className="mt-0.5 flex items-center gap-1.5 border-t border-panel-edge pt-0.5">
          <Operator>=</Operator>
          <dt className="flex-1 font-sans text-[10px] uppercase tracking-wider text-dim">Hypocrisy score</dt>
          <dd className="text-xs font-semibold text-white">{formatScore(line.score)}</dd>
        </div>
      );
  }
};

/** The leaderboard row's score, written out line by line like a bill. */
export const ScoreInvoice = ({ entry, mode }: { entry: LeaderboardEntry; mode: '12m' | 'all' }) => (
  <dl className="mt-1 space-y-px font-num text-[11px] tabular-nums">
    {scoreInvoice(entry, mode).map((line, i) => <Line key={`${line.kind}-${i}`} line={line} />)}
  </dl>
);
