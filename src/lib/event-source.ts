/** Backwards-compatible provenance for rows written before explicit classifier labels. */
export const eventSource = (event: { sourceUrl: string; classifier?: string | null; autoClassified: boolean }) => {
  if (event.sourceUrl.includes('/methodology#simulated')) return 'sim' as const;
  try {
    const host = new URL(event.sourceUrl).hostname;
    if (host === 'globe.adsb.lol') return 'adsb' as const;
    if (host === 'www.vesselfinder.com' || host === 'vesselfinder.com') return 'ais' as const;
  } catch { /* legacy malformed URL: let safeHref handle it */ }
  return event.classifier || event.autoClassified ? 'auto' as const : null;
};

export const eventSourceHref = (event: { sourceUrl: string; autoClassified: boolean }) =>
  eventSource(event) === 'sim' ? '/methodology#simulated' : event.sourceUrl;
