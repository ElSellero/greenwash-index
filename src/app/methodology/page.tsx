import type { Metadata } from 'next';
import { CONFIG } from '@/config';
import { CONTACT } from '@/lib/contact';
import { JET_MODEL_KG_PER_KM } from '@/lib/score/co2';
import { BarList } from '@/components/doc/BarList';
import { DocCard, DocPage, DocSection } from '@/components/doc/DocPage';
import { SourceBadge } from '@/components/ui/SourceBadge';

export const metadata: Metadata = { title: 'Methodology — Greenwash Index' };

const TOC = [
  { id: 'score', label: 'The score' },
  { id: 'multiplier', label: 'Advocacy weights' },
  { id: 'rhetoric', label: 'Rhetoric floor' },
  { id: 'estimates', label: 'Estimated travel' },
  { id: 'dedup', label: 'Counting once' },
  { id: 'factors', label: 'Emission factors' },
  { id: 'provenance', label: 'Data provenance' },
  { id: 'globe', label: 'On the globe' },
  { id: 'corrections', label: 'Corrections' },
  { id: 'credits', label: 'Credits' },
];

const modelName = (key: string) => key.split('-')
  .map((part) => (/\d/.test(part) || part.length <= 3 ? part.toUpperCase() : part[0]!.toUpperCase() + part.slice(1)))
  .join(' ');

const ext = 'text-accent hover:underline';
const External = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={ext}>{children}</a>
);

const Formula = () => (
  <DocCard className="overflow-x-auto p-0">
    <pre className="p-4 font-num text-xs leading-6 text-slate-300">
      <span className="text-white">score</span>{'      = '}<span className="text-neg">co2Tons</span>{' × '}
      <span className="text-pos">multiplier</span>{' + '}<span className="text-accent">rhetoric</span>{'\n'}
      <span className="text-pos">multiplier</span>{` = 1 + min(${CONFIG.score.multiplierCap - 1}, Σ advocacyWeight)\n`}
      <span className="text-accent">rhetoric</span>{`   = min(${CONFIG.score.stanceCap}, ${CONFIG.score.stanceScale} × multiplier × Σ unquantifiedActs)`}
    </pre>
  </DocCard>
);

const MethodologyPage = () => (
  <DocPage current="/methodology" eyebrow="Open formula · no black box" title="Methodology" toc={TOC}
    lede="The Greenwash Index is a satirical, editorial data project. Every ranking is an opinion computed from publicly sourced facts via the open formula below — and the code is open source.">
    <DocSection id="score" index={1} title="The Hypocrisy Score">
      <Formula />
      <p>
        <b>co2Tons</b>{' '}is windowed: the <i>Last 12 months</i>{' '}score uses the rolling year, <i>All-time</i>{' '}uses
        every documented tonne. The multiplier and rhetoric floor are lifetime — not decayed, since the window
        already carries recency. Toggle both windows in the sidebar: the list writes each score out line by line,
        exactly like the formula above.
      </p>
    </DocSection>

    <DocSection id="multiplier" index={2} title="Advocacy weights">
      <p>
        Every documented public statement for the climate adds its weight to the multiplier (capped at{' '}
        {CONFIG.score.multiplierCap}×). The louder the sermon, the harder every tonne counts.
      </p>
      <BarList tone="pos" caption="Advocacy weight per event type"
        rows={Object.entries(CONFIG.score.advocacyWeights).map(([type, weight]) => ({
          label: type[0]!.toUpperCase() + type.slice(1), value: weight,
        }))} />
    </DocSection>

    <DocSection id="rhetoric" index={3} title="Rhetoric floor">
      <p>
        Hypocrisy needs the gap — green talk <i>and</i>{' '}dirty deeds. Documented <i>ownership</i>{' '}we can&apos;t
        turn into a trip (a reported private jet, yacht or mansion) still counts via a small, capped floor term,
        amplified by the same advocacy multiplier, so loud-talk-plus-untracked-exhaust reads above zero.
      </p>
      <p>
        Crucially, <b>advocacy alone never scores</b>: someone who only champions the climate and has no documented
        high-emission act stays at zero — they&apos;re consistent, not a hypocrite. The floor is deliberately tiny;
        real tracked tonnes (× multiplier) dwarf it.
      </p>
    </DocSection>

    <DocSection id="estimates" index={4} title="Estimated travel">
      <p>
        When a flight or yacht trip is documented in the news but no distance is given, we assign a deliberately
        conservative estimated tonnage from the person&apos;s known aircraft or vessel — a representative{' '}
        {CONFIG.co2.estimatedFlightKm} km flight / {CONFIG.co2.estimatedYachtTripKm} km voyage × the kg/km factors
        below — clearly marked <SourceBadge kind="estimated" />, intentionally understating frequent flyers rather
        than overstating them.
      </p>
    </DocSection>

    <DocSection id="dedup" index={5} title="Counting each act once">
      <p>
        One announcement is reported by dozens of outlets, in many languages. Articles describing the same act by
        the same person within {CONFIG.score.dedup.sameEventWindowDays} days are merged into a single entry with every
        source linked — counted once, never inflated by coverage volume. A genuine later re-statement of the same act
        (within {CONFIG.score.dedup.echoWindowDays} days) still counts, but is down-weighted to{' '}
        {CONFIG.score.dedup.echoWeightFactor}× so repetition alone can&apos;t move a ranking. The same rules apply to
        every person on the list.
      </p>
    </DocSection>

    <DocSection id="factors" index={6} title="Emission factors">
      <p>Kilograms of CO2 per kilometre flown, by aircraft model.</p>
      <BarList tone="neg" unit="kg/km" caption="Emission factor in kg CO2 per km by aircraft model"
        rows={Object.entries(JET_MODEL_KG_PER_KM)
          .map(([model, kg]) => ({ label: modelName(model), value: kg }))
          .sort((a, b) => b.value - a.value)} />
      <p className="text-xs">
        Derived from published fuel-burn figures × 3.16 kg CO2 per kg Jet-A. Yachts default to 90 kg/km. All figures
        are estimates, not measurements.
      </p>
    </DocSection>

    <DocSection id="provenance" index={7} title="Data provenance & labels">
      <dl className="space-y-3">
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 pt-0.5"><SourceBadge kind="adsb" /></dt>
          <dd>
            Public ADS-B transponder data (adsb.lol) for jets, public AIS data (AISStream) for yachts. A live
            position that stops updating is greyed out on the globe as <i>signal lost</i>{' '}— after a few hours for
            a vehicle in motion, after a month for a parked one.
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 pt-0.5"><SourceBadge kind="sim" /></dt>
          <dd>
            Plausible fictional voyages for vehicles without public tracking: simulated yachts sail between marinas
            along open-water sea lanes (through Gibraltar, Suez or Panama, never overland); untracked jets are only
            ever shown parked at an airport. Never the basis for claims about a real trip.
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 pt-0.5"><SourceBadge kind="auto" /></dt>
          <dd>
            Events extracted from news articles by a language model (confidence ≥ {CONFIG.score.confidenceThreshold});
            the linked source is authoritative, our classification is editorial.
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 pt-0.5"><SourceBadge kind="estimated" /></dt>
          <dd>Computed from published fuel-burn figures — an estimate, not a measurement.</dd>
        </div>
      </dl>
    </DocSection>

    <DocSection id="globe" index={8} title="On the globe">
      <p>
        Day and night follow the real sun. Solid lines are the path a vehicle has covered on its current trip —
        great circles at cruising altitude for jets, sea lanes on the water for yachts; dotted lines are the rest of a
        simulated voyage. Vehicles parked at the same spot fan out around a marker of their true position. Zoom in and
        sharper satellite imagery (about 500 m per pixel) streams in for the area you are looking at.
      </p>
    </DocSection>

    <DocSection id="corrections" index={9} title="Corrections">
      <p>
        Spotted an event whose source doesn&apos;t support it? Open an issue on{' '}
        {CONTACT.issuesUrl ? <External href={CONTACT.issuesUrl}>GitHub</External> : 'GitHub'}{' '}or write to the
        address in the{' '}
        <a href="/imprint" className={ext}>imprint</a>{' '}— substantiated complaints lead to correction or removal.
      </p>
    </DocSection>

    <DocSection id="credits" index={10} title="Credits">
      <p>
        Earth textures (day map, night lights, clouds, ocean mask):{' '}
        <External href="https://www.solarsystemscope.com/textures/">Solar System Scope</External>{' '}(CC BY 4.0).
        Zoomed-in imagery: NASA Blue Marble Next Generation and Earth at Night (VIIRS, Suomi NPP), served by{' '}
        <External href="https://earthdata.nasa.gov/gibs">NASA GIBS</External>. Live flight data:{' '}
        <External href="https://adsb.lol">adsb.lol</External>. Live vessel data:{' '}
        <External href="https://aisstream.io">AISStream</External>.
      </p>
    </DocSection>
  </DocPage>
);

export default MethodologyPage;
