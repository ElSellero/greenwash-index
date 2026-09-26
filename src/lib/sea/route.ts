import { haversineKm, type LatLng } from '@/lib/geo';
import { SEA_LANES, SEA_NODES, type SeaNodeId } from './lanes';

const DIRECT_KM = 30;

const km = (a: LatLng, b: LatLng) => haversineKm(a.lat, a.lng, b.lat, b.lng);
const at = (id: SeaNodeId): LatLng => ({ lat: SEA_NODES[id][0], lng: SEA_NODES[id][1] });
const NODE_IDS = Object.keys(SEA_NODES) as SeaNodeId[];

const ADJACENCY = (() => {
  const adj = new Map<SeaNodeId, { to: SeaNodeId; km: number }[]>(NODE_IDS.map((id) => [id, []]));
  for (const [a, b] of SEA_LANES) {
    const d = km(at(a), at(b));
    adj.get(a)!.push({ to: b, km: d });
    adj.get(b)!.push({ to: a, km: d });
  }
  return adj;
})();

const nearestNode = (p: LatLng): SeaNodeId => {
  let best = NODE_IDS[0]!, bestKm = Infinity;
  for (const id of NODE_IDS) {
    const d = km(p, at(id));
    if (d < bestKm) { best = id; bestKm = d; }
  }
  return best;
};

const shortestPath = (from: SeaNodeId, to: SeaNodeId): SeaNodeId[] | null => {
  const dist = new Map<SeaNodeId, number>([[from, 0]]);
  const prev = new Map<SeaNodeId, SeaNodeId>();
  const open = new Set<SeaNodeId>([from]);
  const done = new Set<SeaNodeId>();
  while (open.size > 0) {
    let u: SeaNodeId | undefined;
    for (const id of open) if (u === undefined || dist.get(id)! < dist.get(u)!) u = id;
    if (u === undefined) break;
    if (u === to) break;
    open.delete(u);
    done.add(u);
    for (const edge of ADJACENCY.get(u)!) {
      if (done.has(edge.to)) continue;
      const d = dist.get(u)! + edge.km;
      if (d < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, d);
        prev.set(edge.to, u);
        open.add(edge.to);
      }
    }
  }
  if (!dist.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  return path;
};

const pathCache = new Map<string, SeaNodeId[] | null>();
const cachedPath = (from: SeaNodeId, to: SeaNodeId) => {
  const key = from < to ? `${from}|${to}` : `${to}|${from}`;
  if (!pathCache.has(key)) pathCache.set(key, shortestPath(from < to ? from : to, from < to ? to : from));
  const ids = pathCache.get(key)!;
  return ids && from > to ? [...ids].reverse() : ids;
};

/** A route from a to b over water, following the sea lanes between their nearest waypoints. */
export const seaRoute = (a: LatLng, b: LatLng): LatLng[] => {
  const start = { lat: a.lat, lng: a.lng };
  const end = { lat: b.lat, lng: b.lng };
  if (km(a, b) < DIRECT_KM) return [start, end];
  const ids = cachedPath(nearestNode(a), nearestNode(b));
  return ids ? [start, ...ids.map(at), end] : [start, end];
};
