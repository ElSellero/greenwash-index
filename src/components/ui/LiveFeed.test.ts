import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LiveFeed } from './LiveFeed';
import type { RecentEvent } from '@/lib/api-types';

it('shows the event date separately from import date and labels tracked sources correctly', () => {
  const events: RecentEvent[] = [{ id: 1, personId: 1, name: 'Person', slug: 'person', kind: 'negative',
    type: 'flight', title: 'Tracked flight', occurredAt: new Date('2025-07-31T12:00:00Z'),
    createdAt: new Date('2026-10-19T08:15:00Z'), sourceUrl: 'https://globe.adsb.lol/?icao=abc',
    classifier: null, autoClassified: true }];
  const html = renderToStaticMarkup(createElement(LiveFeed, { events }));
  expect(html).toContain('2025-07-31</time>');
  expect(html).toContain('added 2026-10-19');
  expect(html).toContain('>LIVE</span>');
  expect(html).not.toContain('AI-CLASSIFIED');
});
