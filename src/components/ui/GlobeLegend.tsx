'use client';
import { useAppStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { VehicleGlyph } from './VehicleGlyph';

const Swatch = ({ dotted = false, className }: { dotted?: boolean; className: string }) => (
  <span aria-hidden className={`inline-block h-0 w-5 shrink-0 border-t-2 ${dotted ? 'border-dotted' : ''} ${className}`} />
);

const Switch = ({ label, hint, checked, onChange }: {
  label: string; hint: string; checked: boolean; onChange: (on: boolean) => void;
}) => (
  <button type="button" role="switch" aria-checked={checked} title={hint} onClick={() => onChange(!checked)}
    className="flex min-h-7 cursor-pointer items-center gap-2 rounded text-left text-slate-300 transition hover:text-white
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
    <span aria-hidden className={`relative h-3.5 w-6 shrink-0 rounded-full border transition
      ${checked ? 'border-accent/60 bg-accent/30' : 'border-panel-edge bg-abyss'}`}>
      <span className={`absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full transition-all
        ${checked ? 'left-3 bg-accent' : 'left-0.5 bg-dim'}`} />
    </span>
    {label}
  </button>
);

/** Desktop-only key for the globe — what the marks, lines and ghosts mean — plus remembered display settings. */
export const GlobeLegend = () => {
  const hydrated = useHydrated();
  const hdImagery = useAppStore((s) => s.hdImagery);
  const setHdImagery = useAppStore((s) => s.setHdImagery);
  const autoSpin = useAppStore((s) => s.autoSpin);
  const setAutoSpin = useAppStore((s) => s.setAutoSpin);
  return (
    <aside aria-label="Globe legend and display settings"
      className="pointer-events-none absolute bottom-4 left-84 z-10 hidden rounded-lg border border-panel-edge/70 bg-panel/70 px-3 py-2 text-[10px] text-dim backdrop-blur md:block">
      <p className="font-num text-[9px] font-semibold uppercase tracking-[0.25em]">On the radar</p>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
        <li className="flex items-center gap-1.5 text-slate-300"><VehicleGlyph type="jet" />Private jet</li>
        <li className="flex items-center gap-1.5 text-slate-300"><VehicleGlyph type="yacht" />Superyacht</li>
        <li className="flex items-center gap-1.5"><Swatch className="border-jet" />Flight so far</li>
        <li className="flex items-center gap-1.5"><Swatch className="border-yacht" />Voyage by sea</li>
        <li className="flex items-center gap-1.5"><Swatch dotted className="border-yacht/60" />Simulated course</li>
        <li className="flex items-center gap-1.5"><VehicleGlyph type="jet" muted />Signal lost</li>
      </ul>
      <p className="mt-1.5 border-t border-panel-edge/70 pt-1.5">Real-time day &amp; night · drag to spin, tap a craft</p>
      {hydrated && (
        <div className="pointer-events-auto mt-1 grid grid-cols-2 gap-x-4 border-t border-panel-edge/70 pt-1">
          <Switch label="HD imagery" checked={hdImagery} onChange={setHdImagery}
            hint="Stream sharp satellite tiles earlier and one level finer while zoomed — uses more data" />
          <Switch label="Auto-spin" checked={autoSpin} onChange={setAutoSpin}
            hint="Slowly rotate the globe while nothing is selected" />
        </div>
      )}
    </aside>
  );
};
