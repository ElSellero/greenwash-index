import { describe, expect, it } from 'vitest';
import { parseAdsbResponse } from '@/lib/ingest/adsb';

const airborne = { ac: [{ hex: 'a835af', lat: 33.94, lon: -118.40, alt_baro: 38000, gs: 480, track: 70 }] };
const onGround = { ac: [{ hex: 'a835af', lat: 33.94, lon: -118.40, alt_baro: 'ground', gs: 2, track: 0 }] };

describe('parseAdsbResponse', () => {
  it('parses an airborne aircraft', () => {
    const s = parseAdsbResponse(airborne);
    expect(s).toEqual({ lat: 33.94, lng: -118.40, altitudeM: expect.closeTo(11582, 0), heading: 70, isAirborne: true });
  });
  it('detects ground state', () => {
    expect(parseAdsbResponse(onGround)?.isAirborne).toBe(false);
  });
  it('returns null when no aircraft is reported', () => {
    expect(parseAdsbResponse({ ac: [] })).toBeNull();
    expect(parseAdsbResponse({})).toBeNull();
  });
});
