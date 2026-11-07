import { expect, it } from 'vitest';
import { eventSource, eventSourceHref } from './event-source';
it('recognizes legacy simulation and tracking rows even when autoClassified was set', () => {
  const sim = { sourceUrl: 'https://greenwash-index.example/methodology#simulated', autoClassified: true };
  expect(eventSource(sim)).toBe('sim');
  expect(eventSourceHref(sim)).toBe('/methodology#simulated');
  expect(eventSource({ sourceUrl: 'https://globe.adsb.lol/?icao=abc', autoClassified: true })).toBe('adsb');
  expect(eventSource({ sourceUrl: 'https://www.vesselfinder.com/?mmsi=123', autoClassified: true })).toBe('ais');
  expect(eventSource({ sourceUrl: 'https://news.google.com/a', autoClassified: true })).toBe('auto');
  expect(eventSource({ sourceUrl: 'https://example.com/a', autoClassified: false })).toBeNull();
});
