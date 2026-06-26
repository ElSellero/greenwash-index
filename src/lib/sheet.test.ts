import { describe, expect, it } from 'vitest';
import { clampSheetHeight, snapExpanded, shouldDismiss } from '@/lib/sheet';

describe('clampSheetHeight', () => {
  it('clamps below collapsed and above expanded', () => {
    expect(clampSheetHeight(50, 144, 600)).toBe(144);
    expect(clampSheetHeight(999, 144, 600)).toBe(600);
    expect(clampSheetHeight(300, 144, 600)).toBe(300);
  });
});

describe('snapExpanded', () => {
  it('snaps to the nearer end across the midpoint', () => {
    expect(snapExpanded(200, 144, 600)).toBe(false); // below midpoint (372)
    expect(snapExpanded(500, 144, 600)).toBe(true); // above midpoint
  });
});

describe('shouldDismiss', () => {
  it('dismisses only past the downward distance threshold', () => {
    expect(shouldDismiss(30)).toBe(false);
    expect(shouldDismiss(120)).toBe(true);
    expect(shouldDismiss(-200)).toBe(false); // upward swipe never dismisses
  });
});
