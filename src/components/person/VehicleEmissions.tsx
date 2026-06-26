import { formatCo2Kg } from '@/lib/format';

export type Vehicle = { type: string; name: string };

type Props = {
  vehicles: Vehicle[];
  jetCo2Kg: number;
  yachtCo2Kg: number;
  /** 'full' = labelled rows (popup / detail); 'compact' = one tight line (list). */
  variant?: 'full' | 'compact';
};

const names = (vs: Vehicle[]) => vs.map((v) => v.name).join(', ');

const FleetRow = ({ icon, label, vs, co2 }: { icon: string; label: string; vs: Vehicle[]; co2: number }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="min-w-0 truncate">
      <span aria-hidden className="mr-1">{icon}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-dim">{label} </span>
      <span className="text-slate-300">{names(vs)}</span>
    </span>
    <span className="shrink-0 font-[family-name:var(--font-mono-num)] tabular-nums text-neg">
      {co2 > 0 ? formatCo2Kg(co2) : '—'}
    </span>
  </div>
);

/**
 * Breaks a person's tracked emissions apart by vehicle, naming the jets and yachts.
 * Jet emissions come from flight events, yacht emissions from yacht-trip events
 * (assets / advocacy don't show here). Renders nothing if there are no vehicles.
 */
export const VehicleEmissions = ({ vehicles, jetCo2Kg, yachtCo2Kg, variant = 'full' }: Props) => {
  const jets = vehicles.filter((v) => v.type === 'jet');
  const yachts = vehicles.filter((v) => v.type === 'yacht');
  if (jets.length === 0 && yachts.length === 0) return null;

  if (variant === 'compact') {
    return (
      <p className="truncate text-[11px] text-dim">
        {jets.length > 0 && (
          <span>✈ <span className="text-slate-300">{names(jets)}</span>
            {jetCo2Kg > 0 && <span className="text-neg"> {formatCo2Kg(jetCo2Kg)}</span>}</span>
        )}
        {jets.length > 0 && yachts.length > 0 && <span className="text-panel-edge"> · </span>}
        {yachts.length > 0 && (
          <span>🛥 <span className="text-slate-300">{names(yachts)}</span>
            {yachtCo2Kg > 0 && <span className="text-neg"> {formatCo2Kg(yachtCo2Kg)}</span>}</span>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-1.5 text-sm">
      {jets.length > 0 && <FleetRow icon="✈" label="Jet" vs={jets} co2={jetCo2Kg} />}
      {yachts.length > 0 && <FleetRow icon="🛥" label="Yacht" vs={yachts} co2={yachtCo2Kg} />}
    </div>
  );
};
