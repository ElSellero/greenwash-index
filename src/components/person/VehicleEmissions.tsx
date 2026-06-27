import { formatCo2Kg } from '@/lib/format';

export type Vehicle = { type: string; name: string };

export type VehicleType = 'jet' | 'yacht';

type Props = {
  vehicles: Vehicle[];
  jetCo2Kg: number;
  yachtCo2Kg: number;
  /** 'full' = labelled rows (popup / detail); 'compact' = one tight line (list). */
  variant?: 'full' | 'compact';
  /** Popup only: aim the globe at this vehicle type. Rows become clickable buttons. */
  onSelectType?: (type: VehicleType) => void;
  /** Types that have a live position to fly to — only these rows are made clickable. */
  selectableTypes?: readonly VehicleType[];
  /** The type currently aimed at, highlighted as pressed. */
  activeType?: VehicleType | null;
};

const names = (vs: Vehicle[]) => vs.map((v) => v.name).join(', ');

const FleetRow = ({ icon, label, vs, co2, onSelect, active }: {
  icon: string; label: string; vs: Vehicle[]; co2: number;
  onSelect?: () => void; active?: boolean;
}) => {
  const inner = (
    <>
      <span className="min-w-0 truncate">
        <span aria-hidden className="mr-1">{icon}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-dim">{label} </span>
        <span className="text-slate-300">{names(vs)}</span>
      </span>
      <span className="shrink-0 font-[family-name:var(--font-mono-num)] tabular-nums text-neg">
        {co2 > 0 ? formatCo2Kg(co2) : '—'}
      </span>
    </>
  );
  if (!onSelect) {
    return <div className="flex items-baseline justify-between gap-3">{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`-mx-1.5 flex w-full cursor-pointer items-baseline justify-between gap-3 rounded px-1.5 py-1 text-left transition hover:bg-white/5 ${
        active ? 'bg-white/10 ring-1 ring-accent/40' : ''
      }`}
    >
      {inner}
    </button>
  );
};

/**
 * Breaks a person's tracked emissions apart by vehicle, naming the jets and yachts.
 * Jet emissions come from flight events, yacht emissions from yacht-trip events
 * (assets / advocacy don't show here). Renders nothing if there are no vehicles.
 */
export const VehicleEmissions = ({
  vehicles, jetCo2Kg, yachtCo2Kg, variant = 'full',
  onSelectType, selectableTypes, activeType,
}: Props) => {
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

  const rowProps = (type: VehicleType) =>
    onSelectType && selectableTypes?.includes(type)
      ? { onSelect: () => onSelectType(type), active: activeType === type }
      : {};

  return (
    <div className="space-y-1.5 text-sm">
      {jets.length > 0 && <FleetRow icon="✈" label="Jet" vs={jets} co2={jetCo2Kg} {...rowProps('jet')} />}
      {yachts.length > 0 && <FleetRow icon="🛥" label="Yacht" vs={yachts} co2={yachtCo2Kg} {...rowProps('yacht')} />}
    </div>
  );
};
