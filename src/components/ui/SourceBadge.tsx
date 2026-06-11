const STYLES: Record<string, { label: string; cls: string; title: string }> = {
  adsb: { label: 'LIVE', cls: 'text-pos border-pos/40', title: 'Tracked via public ADS-B data' },
  sim: { label: 'SIMULATED', cls: 'text-dim border-panel-edge', title: 'Simulated plausible route — see methodology' },
  auto: { label: 'AI-CLASSIFIED', cls: 'text-accent border-accent/40', title: 'Auto-classified from a news source — click source to verify' },
  estimated: { label: 'ESTIMATED', cls: 'text-amber-400 border-amber-400/40', title: 'Computed estimate — see methodology' },
};

export const SourceBadge = ({ kind }: { kind: keyof typeof STYLES }) => {
  const s = STYLES[kind]!;
  return (
    <span title={s.title}
      className={`rounded border px-1 py-px text-[9px] font-semibold tracking-widest ${s.cls}`}>
      {s.label}
    </span>
  );
};
