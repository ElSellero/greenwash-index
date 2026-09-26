import type { LatLng } from '@/lib/geo';

const DEG = Math.PI / 180;
const wrap180 = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/** Where the sun is directly overhead at `at` (low-precision almanac, ~0.1° accuracy). */
export const subsolarPoint = (at: Date): LatLng => {
  const d = at.getTime() / 86_400_000 - 10_957.5; // days since J2000.0
  const meanAnomaly = (357.529 + 0.98560028 * d) * DEG;
  const meanLongitude = 280.459 + 0.98564736 * d;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG;
  const obliquity = (23.439 - 0.00000036 * d) * DEG;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const siderealDeg = 280.46061837 + 360.98564736629 * d;
  return { lat: declination / DEG, lng: wrap180(rightAscension / DEG - siderealDeg) };
};
