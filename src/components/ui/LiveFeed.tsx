'use client';
import type { RecentEvent } from '@/lib/api-types';
import { SourceBadge } from './SourceBadge';

export const LiveFeed = ({ events }: { events: RecentEvent[] }) => (
  <div className="absolute bottom-40 left-1/2 z-10 w-[min(40rem,90vw)] -translate-x-1/2 md:bottom-4 md:left-auto md:right-4 md:w-96 md:translate-x-0">
    <div className="max-h-40 overflow-y-auto rounded-lg border border-panel-edge bg-panel/80 p-2 backdrop-blur">
      <p className="px-1 text-[10px] uppercase tracking-[0.2em] text-dim">Latest activity</p>
      <ul className="mt-1 space-y-1">
        {events.map((e) => (
          <li key={e.id} className="flex items-baseline gap-2 px-1 text-xs">
            <span className={e.kind === 'positive' ? 'text-pos' : 'text-neg'}>
              {e.kind === 'positive' ? '▲' : '▼'}
            </span>
            <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-slate-300 hover:text-white">
              <span className="text-dim">{e.name}:</span> {e.title}
            </a>
            {e.autoClassified && <SourceBadge kind="auto" />}
          </li>
        ))}
      </ul>
    </div>
  </div>
);
