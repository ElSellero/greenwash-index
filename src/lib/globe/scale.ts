const EARTH_RADIUS_KM = 6371;
const STEPS = [5, 2, 1];

/** Ground distance one screen pixel covers at the point under the camera. */
export const kmPerPixel = (cameraDistance: number, fovDeg: number, viewportPx: number): number =>
  (2 * Math.tan((fovDeg * Math.PI) / 360) * (cameraDistance - 1) * EARTH_RADIUS_KM) / viewportPx;

/** The longest 1-2-5 distance whose bar fits within `maxPx`, and that bar's length. */
export const niceScale = (kmPerPx: number, maxPx: number): { km: number; px: number } => {
  const raw = kmPerPx * maxPx;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = STEPS.find((s) => s * magnitude <= raw) ?? 1;
  const km = Number((step * magnitude).toPrecision(6));
  return { km, px: km / kmPerPx };
};

export const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('en-US')} km`;
