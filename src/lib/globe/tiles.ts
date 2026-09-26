/*
 * NASA GIBS "500m" tile matrix set (EPSG:4326, equirectangular): 512 px tiles, top-left
 * at (-180°, 90°), level z tiles span 288 / 2^z degrees. Edge tiles overhang the globe.
 */
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best';
const LEVEL0_DEG = 288;
export const TILE_PX = 512;
/** Below `min` the global base texture is already as sharp as a tile. */
export const TILE_LEVELS = { min: 4, max: 7 } as const;

const LAYERS = {
  day: 'BlueMarble_NextGeneration/default/500m',
  night: 'VIIRS_CityLights_2012/default/2012-01-01/500m',
} as const;

export type TileLayer = keyof typeof LAYERS;
export type TileKey = { z: number; row: number; col: number };
export type TileRequest = TileKey & { layer: TileLayer };
export type TileBounds = {
  west: number; east: number; north: number; south: number;
  /** Fraction of the tile image that lies on the globe (edge tiles overhang). */
  uSpan: number; vSpan: number;
};

export const tileDeg = (z: number): number => LEVEL0_DEG / 2 ** z;

export const tileGrid = (z: number): { cols: number; rows: number } => ({
  cols: Math.ceil(360 / tileDeg(z)),
  rows: Math.ceil(180 / tileDeg(z)),
});

export const tileAt = (lat: number, lng: number, z: number): TileKey => {
  const deg = tileDeg(z);
  const { cols, rows } = tileGrid(z);
  return {
    z,
    row: Math.min(rows - 1, Math.max(0, Math.floor((90 - lat) / deg))),
    col: Math.min(cols - 1, Math.max(0, Math.floor((lng + 180) / deg))),
  };
};

export const tileBounds = ({ z, row, col }: TileKey): TileBounds => {
  const deg = tileDeg(z);
  const west = -180 + col * deg;
  const north = 90 - row * deg;
  const east = Math.min(180, west + deg);
  const south = Math.max(-90, north - deg);
  return { west, east, north, south, uSpan: (east - west) / deg, vSpan: (north - south) / deg };
};

/** Coarsest level whose pixels are at least as fine as `degPerPx`, or null if the base map suffices. */
export const levelForResolution = (degPerPx: number): number | null => {
  const z = Math.ceil(Math.log2(LEVEL0_DEG / TILE_PX / degPerPx) - 1e-9);
  if (z < TILE_LEVELS.min) return null;
  return Math.min(TILE_LEVELS.max, z);
};

const INDEX = /^(0|[1-9]\d{0,3})$/;

/** Strictly validates a tile request from untrusted path segments. */
export const parseTileRequest = (layer: string, z: string, row: string, col: string): TileRequest | null => {
  if (!(layer in LAYERS) || ![z, row, col].every((s) => INDEX.test(s))) return null;
  const key = { z: Number(z), row: Number(row), col: Number(col) };
  if (key.z > TILE_LEVELS.max) return null;
  const { cols, rows } = tileGrid(key.z);
  if (key.row >= rows || key.col >= cols) return null;
  return { layer: layer as TileLayer, ...key };
};

export const tileSourceUrl = ({ layer, z, row, col }: TileRequest): string =>
  `${GIBS}/${LAYERS[layer]}/${z}/${row}/${col}.jpeg`;

export const tileId = ({ z, row, col }: TileKey): string => `${z}/${row}/${col}`;

/** Tiles at level z under the sampled view points, grown by one ring; null if more than `max`. */
export const coverTiles = (points: { lat: number; lng: number }[], z: number, max: number): TileKey[] | null => {
  const { cols, rows } = tileGrid(z);
  const found = new Map<string, TileKey>();
  for (const p of points) {
    const t = tileAt(p.lat, p.lng, z);
    for (let dr = -1; dr <= 1; dr++) {
      const row = t.row + dr;
      if (row < 0 || row >= rows) continue;
      for (let dc = -1; dc <= 1; dc++) {
        const key = { z, row, col: (t.col + dc + cols) % cols };
        found.set(tileId(key), key);
      }
    }
    if (found.size > max) return null;
  }
  return [...found.values()];
};

/** The finest level from `startZ` down whose cover fits `max` tiles; empty if none does. */
export const pickCover = (points: { lat: number; lng: number }[], startZ: number, max: number): TileKey[] => {
  for (let z = startZ; z >= TILE_LEVELS.min; z--) {
    const keys = coverTiles(points, z, max);
    if (keys) return keys;
  }
  return [];
};
