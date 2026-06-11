import type { PersonDetail } from '@/lib/api-types';
import { ActionItem } from './ActionItem';

export const ActionColumns = ({ events }: { events: PersonDetail['events'] }) => {
  const positive = events.filter((e) => e.kind === 'positive');
  const negative = events.filter((e) => e.kind === 'negative');
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="positive-heading">
        <h2 id="positive-heading"
          className="mb-3 border-b border-pos/30 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-pos">
          What they say ({positive.length})
        </h2>
        <ul className="space-y-3">
          {positive.map((e) => <ActionItem key={e.id} event={e} />)}
          {positive.length === 0 && (
            <li className="text-sm text-dim">Radio silence. Not one documented green word. (At least they&apos;re consistent — multiplier stays at 1×.)</li>
          )}
        </ul>
      </section>
      <section aria-labelledby="negative-heading">
        <h2 id="negative-heading"
          className="mb-3 border-b border-neg/30 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-neg">
          What they do ({negative.length})
        </h2>
        <ul className="space-y-3">
          {negative.map((e) => <ActionItem key={e.id} event={e} />)}
          {negative.length === 0 && (
            <li className="text-sm text-dim">No documented emissions yet — either a saint or a very good transponder switch.</li>
          )}
        </ul>
      </section>
    </div>
  );
};
