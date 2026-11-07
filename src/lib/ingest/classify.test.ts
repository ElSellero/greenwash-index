import { describe, expect, it } from 'vitest';
import { passesGuardrails, classificationSchema, validEventDate, headlineSupportsClassification } from '@/lib/ingest/classify';

const base = {
  relevant: true, kind: 'positive' as const, type: 'speech' as const,
  title: 'Gave climate speech', summary: 'Spoke at summit', confidence: 0.9,
  eventDate: '2026-06-08',
};

describe('passesGuardrails', () => {
  it('accepts a confident, sourced, relevant event', () => {
    expect(passesGuardrails(base, 'https://example.com/article')).toBe(true);
  });
  it('rejects below confidence threshold', () => {
    expect(passesGuardrails({ ...base, confidence: 0.5 }, 'https://example.com/a')).toBe(false);
  });
  it('rejects irrelevant', () => {
    expect(passesGuardrails({ ...base, relevant: false }, 'https://example.com/a')).toBe(false);
  });
  it('rejects non-http sources', () => {
    expect(passesGuardrails(base, 'ftp://nope')).toBe(false);
  });
});

describe('classificationSchema', () => {
  it('rejects invalid advocacy types', () => {
    expect(classificationSchema.safeParse({ ...base, type: 'sorcery' }).success).toBe(false);
  });
  it('accepts full ISO timestamps as eventDate (Gemini emits these)', () => {
    expect(classificationSchema.safeParse({ ...base, eventDate: '2026-06-08T12:00:00.000Z' }).success).toBe(true);
  });
  it('rejects non-date eventDate', () => {
    expect(classificationSchema.safeParse({ ...base, eventDate: 'June 8th' }).success).toBe(false);
  });
});

it('rejects impossible dates before persistence', () => {
  expect(validEventDate('2026-02-30')).toBe(false);
  expect(validEventDate('2026-13-01')).toBe(false);
  expect(validEventDate('2026-06-08T12:00:00Z')).toBe(true);
});

it('requires source evidence of an environmental donation, not general philanthropy', () => {
  const donation = { ...base, type: 'donation' as const };
  expect(headlineSupportsClassification(donation, 'Taylor Swift and Travis Kelce donate to Nashville grocery charity')).toBe(false);
  expect(headlineSupportsClassification(donation, 'Bezos donates $10 billion to fight climate change')).toBe(true);
});
it('distinguishes discussion of climate science from preaching lifestyle changes', () => {
  const preaching = { ...base, type: 'preaching' as const };
  expect(headlineSupportsClassification(preaching, 'Bill Gates discusses the climate impact of contrails')).toBe(false);
  expect(headlineSupportsClassification(preaching, 'Bill Gates urges people to fly less for the climate')).toBe(true);
});

it('rejects generic tracker pages as evidence of a newly dated flight', () => {
  const flight = { ...base, kind: 'negative' as const, type: 'flight' as const };
  expect(headlineSupportsClassification(flight, "Sergey Brin's Private Jet N232G — Live Jet Tracker & History - Celebplanes")).toBe(false);
  expect(headlineSupportsClassification(flight, "David Geffen's Private Jet N221DG — Live Jet Tracker - Celebplanes")).toBe(false);
  expect(headlineSupportsClassification(flight, "Jet tracker: Elon Musk's jet took 170 flights this year")).toBe(true);
});
it('does not turn a retrospective sum or pledge into a completed investment', () => {
  const investment = { ...base, type: 'investment' as const };
  expect(headlineSupportsClassification(investment, "From Selling Records to $3 Billion for Clean Energy: Richard Branson's Journey - AOL.ca")).toBe(false);
  expect(headlineSupportsClassification(investment, 'Branson pledges to invest $3 billion in clean energy')).toBe(false);
  expect(headlineSupportsClassification(investment, 'Branson invests $3 million in clean energy company')).toBe(true);
});

it('requires a documented yacht trip or ownership rather than association', () => {
  const asset = { ...base, kind: 'negative' as const, type: 'asset' as const };
  const trip = { ...asset, type: 'yacht_trip' as const };
  expect(headlineSupportsClassification(asset, "Why is John Travolta's old luxury jet in a small Australian town? - BBC")).toBe(false);
  expect(headlineSupportsClassification(asset, '55m Giorgio Armani-designed Admiral yacht Navis returns to market')).toBe(false);
  expect(headlineSupportsClassification(trip, 'Two Office Employees Face Trial Over €25 Million Abramovich Yacht VAT Case')).toBe(false);
  expect(headlineSupportsClassification(asset, '€25 Million VAT Case in Cyprus Over Abramovich-Linked Luxury Yacht')).toBe(false);
  expect(headlineSupportsClassification(asset, 'Jeff Bezos buys a new superyacht')).toBe(true);
  expect(headlineSupportsClassification(trip, 'Jeff Bezos spotted aboard his superyacht')).toBe(true);
});
