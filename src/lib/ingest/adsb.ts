import { z } from 'zod';

const acSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  alt_baro: z.union([z.number(), z.literal('ground')]).optional(),
  track: z.number().optional(),
});
const responseSchema = z.object({ ac: z.array(acSchema).optional() });

export type AdsbState = {
  lat: number;
  lng: number;
  altitudeM: number | null;
  heading: number | null;
  isAirborne: boolean;
};

export const parseAdsbResponse = (json: unknown): AdsbState | null => {
  const parsed = responseSchema.safeParse(json);
  const ac = parsed.success ? parsed.data.ac?.[0] : undefined;
  if (!ac) return null;
  const isAirborne = typeof ac.alt_baro === 'number' && ac.alt_baro > 300; // ft, filters taxiing
  return {
    lat: ac.lat,
    lng: ac.lon,
    altitudeM: typeof ac.alt_baro === 'number' ? ac.alt_baro * 0.3048 : null,
    heading: ac.track ?? null,
    isAirborne,
  };
};

/** Sequential with a polite delay — adsb.lol is a free community API. */
export const fetchJetStates = async (
  icaos: string[],
): Promise<Map<string, AdsbState | null>> => {
  const out = new Map<string, AdsbState | null>();
  for (const icao of icaos) {
    try {
      const res = await fetch(`https://api.adsb.lol/v2/hex/${icao}`, {
        headers: { 'User-Agent': 'greenwash-index (open-source satire project)' },
        signal: AbortSignal.timeout(10_000),
      });
      out.set(icao, res.ok ? parseAdsbResponse(await res.json()) : null);
    } catch {
      out.set(icao, null); // hybrid strategy: missing data degrades, never breaks
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
};
