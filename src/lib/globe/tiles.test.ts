import { describe, expect, it } from 'vitest';
import {
  coverTiles, levelForResolution, parseTileRequest, pickCover, tileAt, tileBounds, tileGrid, tileSourceUrl, TILE_LEVELS,
} from '@/lib/globe/tiles';

describe('tileGrid', () => {
  it('matches the GIBS 500m tile matrices at both ends', () => {
    expect(tileGrid(0)).toEqual({ cols: 2, rows: 1 });
    expect(tileGrid(7)).toEqual({ cols: 160, rows: 80 });
  });
});

describe('tileAt', () => {
  it('finds the Riviera tile that GIBS serves at level 7', () => {
    expect(tileAt(43.7, 7.4, 7)).toEqual({ z: 7, row: 20, col: 83 });
  });
  it('stays inside the grid at the poles and the antimeridian', () => {
    expect(tileAt(90, 180, 7)).toEqual({ z: 7, row: 0, col: 159 });
    expect(tileAt(-90, -180, 7)).toEqual({ z: 7, row: 79, col: 0 });
  });
});

describe('tileBounds', () => {
  it('spans 2.25° at level 7', () => {
    expect(tileBounds({ z: 7, row: 20, col: 83 })).toMatchObject({ west: 6.75, east: 9, north: 45, south: 42.75 });
  });
  it('clips edge tiles to the globe and reports how much of the image is used', () => {
    const b = tileBounds({ z: 0, row: 0, col: 1 });
    expect(b).toMatchObject({ west: 108, east: 180, north: 90, south: -90 });
    expect(b.uSpan).toBeCloseTo(72 / 288, 9);
    expect(b.vSpan).toBeCloseTo(180 / 288, 9);
  });
});

describe('levelForResolution', () => {
  it('picks the level whose pixels are at least as fine as the screen', () => {
    expect(levelForResolution(288 / 512 / 2 ** 5)).toBe(5);
    expect(levelForResolution(288 / 512 / 2 ** 5 * 0.9)).toBe(6);
  });
  it('never goes beyond the finest level', () => {
    expect(levelForResolution(1e-6)).toBe(TILE_LEVELS.max);
  });
  it('returns null when the base texture is already sharp enough', () => {
    expect(levelForResolution(0.5)).toBeNull();
  });
});

describe('parseTileRequest', () => {
  it('accepts a valid day or night tile', () => {
    expect(parseTileRequest('day', '7', '20', '83')).toEqual({ layer: 'day', z: 7, row: 20, col: 83 });
    expect(parseTileRequest('night', '0', '0', '1')).toEqual({ layer: 'night', z: 0, row: 0, col: 1 });
  });
  it.each([
    ['clouds', '7', '20', '83'],
    ['day', '8', '0', '0'],
    ['day', '7', '80', '0'],
    ['day', '7', '0', '160'],
    ['day', '-1', '0', '0'],
    ['day', '7', '2.5', '1'],
    ['day', '7', '20', '83.jpeg'],
    ['day', '07', '20', '83'],
    ['day', '7', '20', '../x'],
  ])('rejects %s/%s/%s/%s', (layer, z, row, col) => {
    expect(parseTileRequest(layer, z, row, col)).toBeNull();
  });
});

describe('tileSourceUrl', () => {
  it('builds the GIBS REST URL for each layer', () => {
    expect(tileSourceUrl({ layer: 'day', z: 7, row: 20, col: 83 })).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/7/20/83.jpeg');
    expect(tileSourceUrl({ layer: 'night', z: 7, row: 20, col: 83 })).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_CityLights_2012/default/2012-01-01/500m/7/20/83.jpeg');
  });
});

describe('coverTiles', () => {
  const ids = (keys: { z: number; row: number; col: number }[] | null) =>
    keys?.map((k) => `${k.z}/${k.row}/${k.col}`).sort();

  it('covers a point with its tile and the ring around it', () => {
    const keys = coverTiles([{ lat: 43.7, lng: 7.4 }], 7, 50);
    expect(keys).toHaveLength(9);
    expect(ids(keys)).toContain('7/20/83');
    expect(ids(keys)).toContain('7/19/82');
    expect(ids(keys)).toContain('7/21/84');
  });
  it('wraps the ring across the antimeridian', () => {
    expect(ids(coverTiles([{ lat: 0, lng: -179.9 }], 7, 50))).toContain('7/39/159');
  });
  it('does not step past the poles', () => {
    const keys = coverTiles([{ lat: 89.9, lng: 0 }], 7, 50)!;
    expect(keys.every((k) => k.row >= 0)).toBe(true);
    expect(keys).toHaveLength(6);
  });
  it('gives up when the view needs more tiles than allowed', () => {
    const wide = Array.from({ length: 20 }, (_, i) => ({ lat: 40, lng: i * 3 }));
    expect(coverTiles(wide, 7, 12)).toBeNull();
  });
});

describe('pickCover', () => {
  it('drops to a coarser level until the view fits the tile budget', () => {
    const wide = Array.from({ length: 20 }, (_, i) => ({ lat: 40, lng: i * 3 }));
    const keys = pickCover(wide, 7, 40)!;
    expect(keys.length).toBeLessThanOrEqual(40);
    expect(keys[0]!.z).toBeLessThan(7);
  });
  it('returns nothing when even the coarsest tile level would not fit', () => {
    const world = Array.from({ length: 36 }, (_, i) => ({ lat: 0, lng: -180 + i * 10 }));
    expect(pickCover(world, 7, 4)).toEqual([]);
  });
});
