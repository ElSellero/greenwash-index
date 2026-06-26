import { CONFIG } from '@/config';
import { JET_MODEL_KG_PER_KM } from '@/lib/score/co2';

const MethodologyPage = () => (
  <main className="mx-auto max-w-3xl px-4 pb-14 pt-14 text-sm leading-6 sm:px-6 lg:px-8">
    <h1 className="text-2xl font-semibold">Methodology</h1>
    <p className="mt-3 text-dim">
      The Greenwash Index is a satirical, editorial data project. Every ranking is an opinion
      computed from publicly sourced facts via the open formula below. The code is open source.
    </p>
    <h2 className="mt-8 text-lg font-medium">The Hypocrisy Score</h2>
    <pre className="mt-2 rounded bg-panel p-3 font-[family-name:var(--font-mono-num)] text-xs">
{`score      = co2Tons × multiplier + rhetoric
multiplier = 1 + min(${CONFIG.score.multiplierCap - 1}, Σ advocacyWeight × 0.5^(ageDays / ${CONFIG.score.halfLifeDays}))
rhetoric   = min(${CONFIG.score.stanceCap}, ${CONFIG.score.stanceScale} × multiplier × Σ unquantifiedActs × 0.5^(ageDays / ${CONFIG.score.halfLifeDays}))`}
    </pre>
    <table className="mt-4 w-full text-left text-xs">
      <thead><tr className="text-dim"><th className="py-1">Advocacy event</th><th>Weight</th></tr></thead>
      <tbody>
        {Object.entries(CONFIG.score.advocacyWeights).map(([type, weight]) => (
          <tr key={type} className="border-t border-panel-edge">
            <td className="py-1 capitalize">{type}</td>
            <td className="font-[family-name:var(--font-mono-num)]">{weight}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-3 text-dim">
      <b>Estimated travel:</b> when a flight or yacht trip is documented in the news but no distance is
      given, we assign a deliberately conservative estimated tonnage from the person&apos;s known aircraft
      or vessel — a representative {CONFIG.co2.estimatedFlightKm} km flight / {CONFIG.co2.estimatedYachtTripKm} km
      voyage × the kg/km factors below — clearly marked <i>estimated</i>, and intentionally understating
      frequent flyers rather than overstating them.
    </p>
    <p className="mt-3 text-dim">
      <b>Rhetoric floor:</b> hypocrisy needs the gap — green talk <i>and</i> dirty deeds. Documented
      <i> ownership</i> we can&apos;t turn into a trip (a reported private jet, yacht or mansion) still
      counts via a small, capped floor term, amplified by the same advocacy multiplier, so
      loud-talk-plus-untracked-exhaust reads above zero. Crucially, <b>advocacy alone never scores</b>:
      someone who only champions the climate and has no documented high-emission act stays at zero —
      they&apos;re consistent, not a hypocrite. The floor is deliberately tiny — real tracked tonnes
      (× multiplier) dwarf it.
    </p>
    <p className="mt-3 text-dim">
      The leaderboard offers two windows: <b>Last 12 months</b> (the rolling score above,
      what they&apos;re emitting now) and <b>All-time</b> (lifetime documented CO2 × multiplier,
      including historical figures from cited reports). Toggle them in the sidebar.
    </p>
    <h2 className="mt-8 text-lg font-medium">Counting each act once</h2>
    <p className="mt-2 text-dim">
      One announcement is reported by dozens of outlets, in many languages. Articles describing the
      same act by the same person within {CONFIG.score.dedup.sameEventWindowDays} days are merged into
      a single entry with every source linked — counted once, never inflated by coverage volume.
      A genuine later re-statement of the same act (within {CONFIG.score.dedup.echoWindowDays} days)
      still counts, but is down-weighted to {CONFIG.score.dedup.echoWeightFactor}× so repetition alone
      can&apos;t move a ranking. The same rules apply to every person on the list.
    </p>
    <h2 className="mt-8 text-lg font-medium">Emission factors (kg CO2 per km)</h2>
    <table className="mt-2 w-full text-left text-xs">
      <tbody>
        {Object.entries(JET_MODEL_KG_PER_KM).map(([model, kg]) => (
          <tr key={model} className="border-t border-panel-edge">
            <td className="py-1">{model}</td>
            <td className="font-[family-name:var(--font-mono-num)]">{kg}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-2 text-xs text-dim">
      Derived from published fuel-burn figures × 3.16 kg CO2 per kg Jet-A. Yachts default to 90 kg/km.
      All figures are estimates, not measurements.
    </p>
    <h2 className="mt-8 text-lg font-medium">Data provenance &amp; labels</h2>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-dim">
      <li><b className="text-pos">LIVE</b> — public ADS-B transponder data (adsb.lol).</li>
      <li><b>SIMULATED</b> — plausible fictional voyages for vehicles without public tracking. Never the basis for claims about a real trip.</li>
      <li><b className="text-accent">AI-CLASSIFIED</b> — events extracted from news articles by a language model
        (confidence ≥ {CONFIG.score.confidenceThreshold}); the linked source is authoritative, our classification is editorial.</li>
    </ul>
    <h2 className="mt-8 text-lg font-medium">Corrections</h2>
    <p className="mt-2 text-dim">
      Spotted an event whose source doesn&apos;t support it? Open an issue on GitHub or write to the
      address in the imprint — substantiated complaints lead to correction or removal.
    </p>
    <h2 className="mt-8 text-lg font-medium">Credits</h2>
    <p className="mt-2 text-xs text-dim">
      Earth textures (day map, clouds): {' '}
      <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer"
        className="text-accent hover:underline">Solar System Scope</a>{' '}
      (CC BY 4.0). Live flight data:{' '}
      <a href="https://adsb.lol" target="_blank" rel="noopener noreferrer"
        className="text-accent hover:underline">adsb.lol</a>.
    </p>
  </main>
);

export default MethodologyPage;
