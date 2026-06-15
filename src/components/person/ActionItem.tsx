import type { PersonDetail } from '@/lib/api-types';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { formatCo2Kg } from '@/lib/format';

export const ActionItem = ({ event }: { event: PersonDetail['events'][number] }) => {
  const positive = event.kind === 'positive';
  const sources = [event.sourceUrl, ...(event.extraSources ?? [])];
  const isEcho = event.weightFactor < 1;
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <a href={sources[0]} target="_blank" rel="noopener noreferrer"
            className="text-accent underline-offset-2 hover:underline">source ↗</a>
          {sources.slice(1, 4).map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer"
              title="Another outlet reporting the same event"
              className="font-[family-name:var(--font-mono-num)] text-dim hover:text-accent">
              [{i + 2}]
            </a>
          ))}
          {sources.length > 4 && (
            <span className="font-[family-name:var(--font-mono-num)] text-dim"
              title={`${sources.length - 4} more corroborating sources`}>+{sources.length - 4}</span>
          )}
        </span>
        <span className="flex items-center gap-3 font-[family-name:var(--font-mono-num)]">
          {event.co2Kg != null && (
            <span className="text-neg">+{formatCo2Kg(event.co2Kg)} CO2</span>
          )}
          {event.advocacyWeight != null && (
            <span className="text-pos"
              title={isEcho
                ? 'Repeat mention — down-weighted in the hypocrisy multiplier'
                : 'Advocacy weight feeding the hypocrisy multiplier'}>
              +{event.advocacyWeight} advocacy{isEcho ? ' · echo' : ''}
            </span>
          )}
        </span>
      </div>
    </li>
  );
};
