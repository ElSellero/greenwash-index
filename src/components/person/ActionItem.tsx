import type { PersonDetail } from '@/lib/api-types';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { formatCo2Kg } from '@/lib/format';

export const ActionItem = ({ event }: { event: PersonDetail['events'][number] }) => {
  const positive = event.kind === 'positive';
  return (
    <li className={`rounded-lg border p-3 ${positive ? 'border-pos/25 bg-pos/5' : 'border-neg/25 bg-neg/5'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <time className="shrink-0 font-[family-name:var(--font-mono-num)] text-[11px] text-dim">
          {new Date(event.occurredAt).toISOString().slice(0, 10)}
        </time>
        <span className="flex gap-1">
          {event.autoClassified && <SourceBadge kind="auto" />}
          {event.co2Kg != null && <SourceBadge kind="estimated" />}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium">{event.title}</p>
      {event.description && <p className="mt-0.5 text-xs text-dim">{event.description}</p>}
      <div className="mt-2 flex items-center justify-between text-xs">
        <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="text-accent underline-offset-2 hover:underline">source ↗</a>
        {event.co2Kg != null && (
          <span className="font-[family-name:var(--font-mono-num)] text-neg">
            +{formatCo2Kg(event.co2Kg)} CO2
          </span>
        )}
        {event.advocacyWeight != null && (
          <span className="font-[family-name:var(--font-mono-num)] text-pos"
            title="Advocacy weight feeding the hypocrisy multiplier">
            +{event.advocacyWeight} advocacy
          </span>
        )}
      </div>
    </li>
  );
};
