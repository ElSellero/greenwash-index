import type { GlobeVehicle } from './fleet';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const formatAge = (ms: number): string => {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  if (ms < 60 * DAY) return `${Math.round(ms / DAY)} d`;
  return `${Math.round(ms / (30 * DAY))} mo`;
};

/** What the vehicle is doing, e.g. "under way → St. Barts", "parked" or "signal lost". */
export const describeActivity = (v: GlobeVehicle): string => {
  if (v.status === 'stale') return 'signal lost';
  if (v.status === 'moving') {
    const motion = v.type === 'jet' ? 'in flight' : 'under way';
    return `${motion}${v.destination ? ` → ${v.destination}` : ''}`;
  }
  return v.type === 'jet' ? 'parked' : 'moored';
};

/** One line for a label: "under way → St. Barts · simulated" or "signal lost · last seen 2 d ago". */
export const describeStatus = (v: GlobeVehicle, now: Date): string => {
  if (v.status === 'stale') {
    return `signal lost · last seen ${formatAge(now.getTime() - new Date(v.recordedAt).getTime())} ago`;
  }
  return `${describeActivity(v)} · ${v.source === 'sim' ? 'simulated' : 'live'}`;
};

/** "Sep 24, 00:00" in the viewer's time zone (or `timeZone`), with the year only if it isn't this one. */
export const formatWhen = (at: Date, now: Date, timeZone?: string): string => {
  const year = (d: Date) => new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(d);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
    ...(year(at) === year(now) ? {} : { year: 'numeric' }),
  }).format(at);
};

/** "Monaco · since Sep 24, 00:00" or "near Van Nuys · position from Sep 26, 17:00 (3 h ago)". */
export const describeLocation = (v: GlobeVehicle, now: Date, timeZone?: string): string => {
  const { name, at, kind } = v.location;
  const when = formatWhen(at, now, timeZone);
  return kind === 'since'
    ? `${name} · since ${when}`
    : `${name} · position from ${when} (${formatAge(now.getTime() - at.getTime())} ago)`;
};
