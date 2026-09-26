import { haversineKm } from '@/lib/geo';

type Point = { id: number; lat: number; lng: number };
export type FanSlot = { index: number; count: number };

/**
 * Groups vehicles closer than `radiusKm` (transitively) so the globe can fan them out
 * around their shared spot instead of stacking them. Slots are ordered by id.
 */
export const fanOut = (points: Point[], radiusKm = 25): Map<number, FanSlot> => {
  const parent = points.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i]!)));
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]!, b = points[j]!;
      if (haversineKm(a.lat, a.lng, b.lat, b.lng) < radiusKm) parent[root(i)] = root(j);
    }
  }
  const groups = new Map<number, Point[]>();
  points.forEach((p, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), p]));
  const slots = new Map<number, FanSlot>();
  for (const group of groups.values()) {
    group.sort((a, b) => a.id - b.id).forEach((p, index) => slots.set(p.id, { index, count: group.length }));
  }
  return slots;
};
