import { CONFIG } from '@/config';

export type ExistingEvent = { id: number; occurredAt: Date };

export type DedupDecision =
  | { action: 'merge'; targetId: number } // same act, another outlet → just link the source
  | { action: 'echo' } // a later re-statement of the same act → count, but lighter
  | { action: 'new' }; // a distinct act → full weight

const DAY_MS = 86_400_000;

/**
 * Decide how a freshly classified event relates to existing events of the SAME
 * person + kind + type. The caller pre-filters `nearby` to that group. Pure and
 * deterministic so it can be unit-tested without a database.
 *
 * - within sameEventWindowDays → merge (one act, many sources, counted once)
 * - within echoWindowDays      → echo  (a repeat mention, down-weighted)
 * - otherwise                  → new   (a separate act, full weight)
 */
export const dedupDecision = (
  occurredAt: Date,
  nearby: ExistingEvent[],
): DedupDecision => {
  const { sameEventWindowDays, echoWindowDays } = CONFIG.score.dedup;
  let nearest: { id: number; days: number } | null = null;
  for (const e of nearby) {
    const days = Math.abs(occurredAt.getTime() - e.occurredAt.getTime()) / DAY_MS;
    if (nearest === null || days < nearest.days) nearest = { id: e.id, days };
  }
  if (nearest === null) return { action: 'new' };
  if (nearest.days <= sameEventWindowDays) return { action: 'merge', targetId: nearest.id };
  if (nearest.days <= echoWindowDays) return { action: 'echo' };
  return { action: 'new' };
};
