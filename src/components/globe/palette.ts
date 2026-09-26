/** Mirrors --color-jet / --color-yacht / --color-dim in globals.css; three.js can't read CSS variables. */
export const VEHICLE_COLORS: Record<string, string> = { jet: '#38bdf8', yacht: '#e879f9' };
export const STALE_COLOR = '#7d8db1';
export const colorOf = (type: string): string => VEHICLE_COLORS[type] ?? '#ffffff';
