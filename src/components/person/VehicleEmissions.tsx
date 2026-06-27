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

/** Crosshair — signals "aim the globe here". Stays visible on touch (no hover). */
const LocateIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <circle cx="12" cy="12" r="6.5" />
    <line x1="12" y1="1.5" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22.5" />
    <line x1="1.5" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22.5" y2="12" />
  </svg>
);

const RowLabel = ({ icon, label, vs }: { icon: string; label: string; vs: Vehicle[] }) => (
  <span className="min-w-0 flex-1 truncate">
    <span aria-hidden className="mr-1">{icon}</span>
    <span className="text-[9px] font-semibold uppercase tracking-wider text-dim">{label} </span>
    <span className="text-slate-300">{names(vs)}</span>
  </span>
);

const RowCo2 = ({ co2 }: { co2: number }) => (
  <span className="shrink-0 font-[family-name:var(--font-mono-num)] tabular-nums text-neg">
    {co2 > 0 ? formatCo2Kg(co2) : '—'}
  </span>
);

const FleetRow = ({ icon, label, vs, co2, onSelect, active }: {
  icon: string; label: string; vs: Vehicle[]; co2: number;
  onSelect?: () => void; active?: boolean;
}) => {
  if (!onSelect) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <RowLabel icon={icon} label={label} vs={vs} />
        <RowCo2 co2={co2} />
      </div>
    );
  }
  // The persistent ring + crosshair read as "tappable" on touch; hover deepens it.
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title="Locate on globe"
      className={`group -mx-1.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 text-left ring-1 transition
        ${active
          ? 'bg-accent/10 ring-accent/40'
          : 'bg-white/[0.03] ring-white/[0.06] hover:bg-white/10 hover:ring-white/15'}`}
    >
      <RowLabel icon={icon} label={label} vs={vs} />
      <span className="flex shrink-0 items-center gap-1.5">
        <RowCo2 co2={co2} />
        <LocateIcon className={`shrink-0 transition-transform group-hover:scale-110 ${
          active ? 'text-accent' : 'text-dim group-hover:text-accent'}`} />
      </span>
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
