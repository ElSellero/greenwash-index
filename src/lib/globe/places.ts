import { haversineKm } from '@/lib/geo';

type Place = { name: string; lat: number; lng: number };

/** Offline gazetteer for "near …" labels: world cities plus yachting and private-aviation hubs. */
export const PLACES: Place[] = [
  // Europe
  { name: 'London', lat: 51.507, lng: -0.128 }, { name: 'Farnborough', lat: 51.28, lng: -0.77 },
  { name: 'Paris', lat: 48.857, lng: 2.352 }, { name: 'Berlin', lat: 52.52, lng: 13.405 },
  { name: 'Hamburg', lat: 53.551, lng: 9.994 }, { name: 'Munich', lat: 48.137, lng: 11.576 },
  { name: 'Amsterdam', lat: 52.37, lng: 4.895 }, { name: 'Brussels', lat: 50.85, lng: 4.352 },
  { name: 'Vienna', lat: 48.208, lng: 16.373 }, { name: 'Zurich', lat: 47.377, lng: 8.542 },
  { name: 'Geneva', lat: 46.204, lng: 6.143 }, { name: 'Madrid', lat: 40.417, lng: -3.704 },
  { name: 'Barcelona', lat: 41.385, lng: 2.173 }, { name: 'Lisbon', lat: 38.722, lng: -9.139 },
  { name: 'Marbella', lat: 36.51, lng: -4.883 }, { name: 'Palma', lat: 39.57, lng: 2.65 },
  { name: 'Ibiza', lat: 38.907, lng: 1.433 }, { name: 'Rome', lat: 41.903, lng: 12.496 },
  { name: 'Milan', lat: 45.464, lng: 9.19 }, { name: 'Genoa', lat: 44.405, lng: 8.946 },
  { name: 'La Spezia', lat: 44.102, lng: 9.824 }, { name: 'Portofino', lat: 44.303, lng: 9.21 },
  { name: 'Naples', lat: 40.852, lng: 14.268 }, { name: 'Nice', lat: 43.71, lng: 7.262 },
  { name: 'Monaco', lat: 43.738, lng: 7.425 }, { name: 'Cannes', lat: 43.552, lng: 7.017 },
  { name: 'Saint-Tropez', lat: 43.27, lng: 6.64 }, { name: 'Marseille', lat: 43.296, lng: 5.37 },
  { name: 'Porto Cervo', lat: 41.136, lng: 9.535 }, { name: 'Valletta', lat: 35.899, lng: 14.514 },
  { name: 'Dubrovnik', lat: 42.65, lng: 18.094 }, { name: 'Split', lat: 43.508, lng: 16.44 },
  { name: 'Athens', lat: 37.984, lng: 23.728 }, { name: 'Mykonos', lat: 37.446, lng: 25.329 },
  { name: 'Istanbul', lat: 41.008, lng: 28.978 }, { name: 'Moscow', lat: 55.756, lng: 37.617 },
  { name: 'Reykjavík', lat: 64.146, lng: -21.942 },
  // Middle East & Africa
  { name: 'Dubai', lat: 25.205, lng: 55.271 }, { name: 'Abu Dhabi', lat: 24.454, lng: 54.377 },
  { name: 'Doha', lat: 25.285, lng: 51.531 }, { name: 'Riyadh', lat: 24.713, lng: 46.675 },
  { name: 'Tel Aviv', lat: 32.085, lng: 34.782 }, { name: 'Cairo', lat: 30.044, lng: 31.236 },
  { name: 'Marrakesh', lat: 31.63, lng: -7.99 }, { name: 'Lagos', lat: 6.524, lng: 3.379 },
  { name: 'Nairobi', lat: -1.292, lng: 36.822 }, { name: 'Johannesburg', lat: -26.204, lng: 28.047 },
  { name: 'Cape Town', lat: -33.925, lng: 18.424 }, { name: 'Victoria (Seychelles)', lat: -4.62, lng: 55.45 },
  // Asia & Oceania
  { name: 'Malé', lat: 4.175, lng: 73.509 }, { name: 'Mumbai', lat: 19.076, lng: 72.878 },
  { name: 'Delhi', lat: 28.614, lng: 77.209 }, { name: 'Singapore', lat: 1.352, lng: 103.82 },
  { name: 'Phuket', lat: 7.88, lng: 98.39 }, { name: 'Bali', lat: -8.65, lng: 115.216 },
  { name: 'Hong Kong', lat: 22.319, lng: 114.169 }, { name: 'Shanghai', lat: 31.23, lng: 121.474 },
  { name: 'Beijing', lat: 39.904, lng: 116.407 }, { name: 'Seoul', lat: 37.566, lng: 126.978 },
  { name: 'Tokyo', lat: 35.676, lng: 139.65 }, { name: 'Sydney', lat: -33.869, lng: 151.209 },
  { name: 'Melbourne', lat: -37.814, lng: 144.963 }, { name: 'Brisbane', lat: -27.47, lng: 153.026 },
  { name: 'Cairns', lat: -16.919, lng: 145.771 }, { name: 'Perth', lat: -31.95, lng: 115.861 },
  { name: 'Auckland', lat: -36.848, lng: 174.763 }, { name: 'Honolulu', lat: 21.307, lng: -157.858 },
  // Americas
  { name: 'New York', lat: 40.713, lng: -74.006 }, { name: 'Teterboro', lat: 40.85, lng: -74.061 },
  { name: 'Boston', lat: 42.36, lng: -71.058 }, { name: 'Washington', lat: 38.907, lng: -77.037 },
  { name: 'Pittsburgh', lat: 40.44, lng: -79.996 }, { name: 'Chicago', lat: 41.878, lng: -87.63 },
  { name: 'Atlanta', lat: 33.749, lng: -84.388 }, { name: 'Miami', lat: 25.762, lng: -80.192 },
  { name: 'Fort Lauderdale', lat: 26.122, lng: -80.137 }, { name: 'Palm Beach', lat: 26.705, lng: -80.036 },
  { name: 'Nassau', lat: 25.048, lng: -77.355 }, { name: 'Dallas', lat: 32.777, lng: -96.797 },
  { name: 'Houston', lat: 29.76, lng: -95.37 }, { name: 'Aspen', lat: 39.191, lng: -106.818 },
  { name: 'Las Vegas', lat: 36.17, lng: -115.14 }, { name: 'Los Angeles', lat: 34.052, lng: -118.244 },
  { name: 'Van Nuys', lat: 34.186, lng: -118.449 }, { name: 'San Francisco', lat: 37.775, lng: -122.419 },
  { name: 'Seattle', lat: 47.606, lng: -122.332 }, { name: 'Vancouver', lat: 49.283, lng: -123.121 },
  { name: 'Toronto', lat: 43.653, lng: -79.383 }, { name: 'Mexico City', lat: 19.433, lng: -99.133 },
  { name: 'Cancún', lat: 21.161, lng: -86.852 }, { name: 'St. Barts', lat: 17.9, lng: -62.833 },
  { name: 'St. Maarten', lat: 18.04, lng: -63.05 }, { name: 'Antigua', lat: 17.127, lng: -61.846 },
  { name: 'Bermuda', lat: 32.3, lng: -64.78 }, { name: 'São Paulo', lat: -23.551, lng: -46.633 },
  { name: 'Rio de Janeiro', lat: -22.907, lng: -43.173 }, { name: 'Buenos Aires', lat: -34.604, lng: -58.382 },
];

const NEAR_KM = 60;

/** The closest gazetteer place within `maxKm`, or null. */
export const nearestPlace = (lat: number, lng: number, maxKm = NEAR_KM): string | null => {
  let best: Place | null = null, bestKm = maxKm;
  for (const p of PLACES) {
    const km = haversineKm(lat, lng, p.lat, p.lng);
    if (km <= bestKm) { best = p; bestKm = km; }
  }
  return best?.name ?? null;
};

export const formatCoords = (lat: number, lng: number): string =>
  `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
