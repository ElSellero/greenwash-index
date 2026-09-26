import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { tileBounds } from '@/lib/globe/tiles';
import { latLngToVector3 } from '@/lib/geo';
import { buildTileGeometry } from './tileGeometry';

const attr = (g: ReturnType<typeof buildTileGeometry>, name: string, i: number, size: number) =>
  Array.from({ length: size }, (_, k) => g.getAttribute(name).array[i * size + k]!);

describe('buildTileGeometry', () => {
  const bounds = tileBounds({ z: 7, row: 20, col: 83 });
  const g = buildTileGeometry(bounds, 1);

  it('puts the first vertex on the tile’s north-west corner', () => {
    const p = new Vector3(...attr(g, 'position', 0, 3));
    expect(p.distanceTo(latLngToVector3(bounds.north, bounds.west, 1))).toBeLessThan(1e-6);
  });

  it('maps the image top-left to that corner and the globe texture to its lat/lng', () => {
    expect(attr(g, 'uv', 0, 2)).toEqual([0, 1]);
    const [u, v] = attr(g, 'globalUv', 0, 2);
    expect(u).toBeCloseTo((bounds.west + 180) / 360, 6);
    expect(v).toBeCloseTo((bounds.north + 90) / 180, 6);
  });

  it('only uses the on-globe part of an overhanging edge tile', () => {
    const edge = tileBounds({ z: 0, row: 0, col: 1 });
    const us = Array.from(buildTileGeometry(edge, 1).getAttribute('uv').array).filter((_, i) => i % 2 === 0);
    expect(Math.max(...us)).toBeCloseTo(edge.uSpan, 6);
  });

  it('faces outward so the planet side is culled', () => {
    const index = g.getIndex()!.array;
    const vertex = (i: number) => new Vector3(...attr(g, 'position', index[i]!, 3));
    const [a, b, c] = [vertex(0), vertex(1), vertex(2)];
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    expect(normal.dot(a)).toBeGreaterThan(0);
  });
});
