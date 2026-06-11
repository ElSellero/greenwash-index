import { describe, expect, it } from 'vitest';
import { passesGuardrails, classificationSchema } from '@/lib/ingest/classify';

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
});
