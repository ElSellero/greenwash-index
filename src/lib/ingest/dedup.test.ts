import { describe, expect, it } from 'vitest';
import { dedupDecision, type ExistingEvent } from '@/lib/ingest/dedup';
import { CONFIG } from '@/config';

const { sameEventWindowDays, echoWindowDays } = CONFIG.score.dedup;
const DAY = 86_400_000;
const at = (iso: string) => new Date(iso);
const daysAfter = (base: Date, d: number) => new Date(base.getTime() + d * DAY);

describe('dedupDecision', () => {
  const base = at('2026-06-01T12:00:00Z');

  it('treats a first-of-its-kind event as new', () => {
    expect(dedupDecision(base, [])).toEqual({ action: 'new' });
  });

  it('merges coverage of the same act (within the same-event window)', () => {
    const existing: ExistingEvent[] = [{ id: 7, occurredAt: base }];
    const sameAct = daysAfter(base, sameEventWindowDays - 1);
    expect(dedupDecision(sameAct, existing)).toEqual({ action: 'merge', targetId: 7 });
  });

  it('merges regardless of direction (article dated before the stored event)', () => {
    const existing: ExistingEvent[] = [{ id: 9, occurredAt: base }];
    const earlier = daysAfter(base, -(sameEventWindowDays - 1));
    expect(dedupDecision(earlier, existing)).toEqual({ action: 'merge', targetId: 9 });
  });

  it('counts a later re-statement as an echo (beyond same-event, within echo window)', () => {
    const existing: ExistingEvent[] = [{ id: 3, occurredAt: base }];
    const restated = daysAfter(base, sameEventWindowDays + 3);
    expect(dedupDecision(restated, existing)).toEqual({ action: 'echo' });
  });

  it('treats a clearly separate act as new (beyond the echo window)', () => {
    const existing: ExistingEvent[] = [{ id: 1, occurredAt: base }];
    const separate = daysAfter(base, echoWindowDays + 5);
    expect(dedupDecision(separate, existing)).toEqual({ action: 'new' });
  });

  it('picks the nearest existing event when several are in range', () => {
    const existing: ExistingEvent[] = [
      { id: 1, occurredAt: daysAfter(base, -10) },
      { id: 2, occurredAt: daysAfter(base, 1) }, // nearest
      { id: 3, occurredAt: daysAfter(base, 12) },
    ];
    expect(dedupDecision(base, existing)).toEqual({ action: 'merge', targetId: 2 });
  });
});
