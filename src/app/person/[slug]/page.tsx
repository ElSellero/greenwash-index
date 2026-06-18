import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPersonDetail } from '@/lib/db/queries';
import { ActionColumns } from '@/components/person/ActionColumns';
import { ScoreBreakdown } from '@/components/person/ScoreBreakdown';
import { Co2Ticker } from '@/components/ui/Co2Ticker';
import { AdSlot } from '@/components/ui/AdSlot';

export const revalidate = 300;

const PersonPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const detail = await getPersonDetail(slug);
  if (!detail) notFound();
  const { person, snapshot, events, vehicles, allTimeRank } = detail;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-14 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-dim hover:text-accent">← back to the globe</Link>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-dim">
            {allTimeRank ? `Rank #${allTimeRank} all-time` : 'Unranked'} · {person.category}
          </p>
          <h1 className="text-3xl font-semibold">{person.name}</h1>
          {person.bio && <p className="mt-1 max-w-prose text-sm text-slate-300">{person.bio}</p>}
          <p className="mt-1 text-sm text-dim">
            {vehicles.map((v) => v.name).join(' · ') || 'No tracked vehicles'}
          </p>
        </div>
        {snapshot && (
          <p className="text-right">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-dim">Total documented CO2</span>
            <Co2Ticker baseKg={snapshot.co2KgTotal} ratePerSec={snapshot.co2RatePerSec}
              snapshotAt={snapshot.snapshotDate} className="text-2xl text-neg" />
          </p>
        )}
      </header>
      {snapshot && <div className="mt-6"><ScoreBreakdown snapshot={snapshot} /></div>}
      <div className="mt-8"><ActionColumns events={events} /></div>
      <div className="mt-10"><AdSlot slot="person-footer" /></div>
    </main>
  );
};

export default PersonPage;
