import { describe, expect, it } from 'vitest';
import { subsolarPoint } from '@/lib/globe/sun';

describe('subsolarPoint', () => {
  it('sits on the Tropic of Cancer at the June solstice', () => {
    expect(subsolarPoint(new Date('2026-06-21T12:00:00Z')).lat).toBeCloseTo(23.44, 0);
  });
  it('sits on the Tropic of Capricorn at the December solstice', () => {
    expect(subsolarPoint(new Date('2026-12-21T12:00:00Z')).lat).toBeCloseTo(-23.44, 0);
  });
  it('crosses the equator at the March equinox', () => {
    expect(Math.abs(subsolarPoint(new Date('2026-03-20T15:00:00Z')).lat)).toBeLessThan(0.5);
  });
  it('is over Greenwich around noon UTC, give or take the equation of time', () => {
    expect(Math.abs(subsolarPoint(new Date('2026-06-21T12:00:00Z')).lng)).toBeLessThan(4);
  });
  it('moves west by 15° per hour', () => {
    const noon = subsolarPoint(new Date('2026-09-26T12:00:00Z')).lng;
    const six = subsolarPoint(new Date('2026-09-26T18:00:00Z')).lng;
    expect(noon - six).toBeCloseTo(90, 0);
  });
  it('keeps longitude within [-180, 180]', () => {
    const p = subsolarPoint(new Date('2026-09-26T23:59:00Z'));
    expect(p.lng).toBeGreaterThanOrEqual(-180);
    expect(p.lng).toBeLessThanOrEqual(180);
  });
});
