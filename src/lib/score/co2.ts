/**
 * Published estimates, documented on /methodology.
 * kg CO2 per km at typical cruise. Sources: aircraft fuel-burn specs × 3.16 kg CO2 per kg Jet-A.
 */
export const JET_MODEL_KG_PER_KM: Record<string, number> = {
  'gulfstream-g650': 4.9,
  'gulfstream-g550': 4.4,
  'global-6000': 4.6,
  'global-express': 4.7,
  'falcon-7x': 3.4,
  'falcon-900': 3.3,
  'citation-x': 3.2,
  'embraer-legacy-650': 3.8,
  'boeing-737-bbj': 12.0,
  'boeing-757-vip': 14.5,
  'boeing-767-vip': 16.0,
  'airbus-a319-acj': 11.5,
};

export const tripCo2Kg = (distanceKm: number, vehicleKgPerKm: number): number =>
  Math.max(0, distanceKm) * vehicleKgPerKm;

/** For the client ticker: how fast the counter should tick, from the last 24h total. */
export const co2RatePerSecond = (last24hKg: number): number => last24hKg / 86_400;
