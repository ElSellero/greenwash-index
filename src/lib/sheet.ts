/**
 * Pure helpers for drag-to-resize / swipe-to-dismiss bottom sheets.
 * Kept framework-free so the snap logic is unit-testable; the React components
 * wire pointer events to these.
 */

/** Clamp a live-dragged sheet height between its collapsed and expanded snap points. */
export const clampSheetHeight = (px: number, collapsed: number, expanded: number): number =>
  Math.min(expanded, Math.max(collapsed, px));

/** After releasing a drag, snap to expanded iff the sheet ended past the midpoint. */
export const snapExpanded = (heightPx: number, collapsed: number, expanded: number): boolean =>
  heightPx > (collapsed + expanded) / 2;

/** A pointer move counts as a drag (vs a tap) once it travels past this many px. */
export const DRAG_THRESHOLD_PX = 6;

/**
 * Decide whether a swipe-down gesture should dismiss an overlay: dismiss when the
 * finger travelled far enough OR flicked fast enough (downward = positive deltaY).
 */
export const shouldDismiss = (deltaY: number, distancePx = 80): boolean =>
  deltaY > distancePx;
