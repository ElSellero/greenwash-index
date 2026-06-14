import WebSocket from 'ws';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { vehicles } from '../src/lib/db/schema';
import { recordObservation } from '../src/lib/ingest/pipeline';

/**
 * Forward-real yacht tracking via the AISStream realtime websocket.
 * Subscribes (server-side filtered) to the MMSIs of our yacht fleet, keeps the
 * latest position per vessel, and every FLUSH_MS feeds it through the same
 * recordObservation trip/CO2 pipeline the jets use. Long-running + self-
 * reconnecting; run detached like the backfill supervisor. AIS is realtime
 * only (no history) and superyachts often switch AIS off — coverage is sparse.
 */
const FLUSH_MS = 5 * 60_000;
const ENDPOINT = 'wss://stream.aisstream.io/v0/stream';
const key = process.env.AISSTREAM_API_KEY;

type Obs = { lat: number; lng: number; isMoving: boolean; heading: number | null; altitudeM: null };
type Yacht = typeof vehicles.$inferSelect;

const latest = new Map<string, Obs>(); // mmsi -> latest observed position
let byMmsi = new Map<string, Yacht>();
let ws: WebSocket | null = null;

const flush = async () => {
  const now = new Date();
  for (const [mmsi, v] of byMmsi) {
    const obs = latest.get(mmsi);
    if (!obs) continue;
    latest.delete(mmsi);
    try {
      await recordObservation(v, obs, 'ais', now);
      console.log(`  flush ${v.name} @ ${obs.lat.toFixed(3)},${obs.lng.toFixed(3)} moving=${obs.isMoving}`);
    } catch (e) {
      console.log(`  flush error ${v.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
};

const connect = (mmsis: string[]) => {
  ws = new WebSocket(ENDPOINT);
  ws.on('open', () => {
    ws!.send(JSON.stringify({
      APIKey: key,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FiltersShipMMSI: mmsis,
      FilterMessageTypes: ['PositionReport'],
    }));
    console.log(`[${new Date().toISOString()}] connected; subscribed to ${mmsis.length} MMSIs`);
  });
  ws.on('message', (data: WebSocket.RawData) => {
    let m: Record<string, unknown>;
    try { m = JSON.parse(data.toString()); } catch { return; }
    if (typeof m.error === 'string') { console.log(`AISStream error: ${m.error}`); return; }
    if (m.MessageType !== 'PositionReport') return;
    const meta = m.MetaData as { MMSI?: number; latitude?: number; longitude?: number } | undefined;
    const pr = (m.Message as { PositionReport?: Record<string, number> } | undefined)?.PositionReport;
    const mmsi = String(meta?.MMSI ?? '');
    if (!pr || !byMmsi.has(mmsi)) return;
    const lat = pr.Latitude ?? meta?.latitude;
    const lng = pr.Longitude ?? meta?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const heading = typeof pr.TrueHeading === 'number' && pr.TrueHeading < 511 ? pr.TrueHeading : (pr.Cog ?? null);
    latest.set(mmsi, { lat, lng, isMoving: (pr.Sog ?? 0) > 1, heading, altitudeM: null });
  });
  ws.on('close', () => { console.log('ws closed — reconnecting in 5s'); setTimeout(() => connect(mmsis), 5_000); });
  ws.on('error', (e: Error) => { console.log(`ws error: ${e.message}`); try { ws?.close(); } catch { /* noop */ } });
};

const main = async () => {
  if (!key) { console.error('AISSTREAM_API_KEY not set'); process.exit(1); }
  const yachts = await db.select().from(vehicles)
    .where(and(eq(vehicles.type, 'yacht'), isNotNull(vehicles.mmsi)));
  if (yachts.length === 0) { console.error('no yachts with an mmsi — populate vehicles.mmsi first'); process.exit(1); }
  byMmsi = new Map(yachts.map((v) => [String(v.mmsi), v]));
  console.log(`tracking ${yachts.length} yachts: ${yachts.map((v) => `${v.name}(${v.mmsi})`).join(', ')}`);
  setInterval(() => { void flush(); }, FLUSH_MS);
  connect([...byMmsi.keys()]);
};

main().catch((e) => { console.error('ais-collector aborted:', e); process.exit(1); });
