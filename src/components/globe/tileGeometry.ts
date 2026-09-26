import { BufferGeometry, Float32BufferAttribute } from 'three';
import { latLngToVector3 } from '@/lib/geo';
import type { TileBounds } from '@/lib/globe/tiles';

const MAX_SEGMENT_DEG = 0.75;

/** A patch of the sphere covering one imagery tile, with image UVs and globe-texture UVs. */
export const buildTileGeometry = (b: TileBounds, radius: number): BufferGeometry => {
  const cols = Math.max(2, Math.ceil((b.east - b.west) / MAX_SEGMENT_DEG));
  const rows = Math.max(2, Math.ceil((b.north - b.south) / MAX_SEGMENT_DEG));
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], globalUvs: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const lat = b.north - ((b.north - b.south) * j) / rows;
    for (let i = 0; i <= cols; i++) {
      const lng = b.west + ((b.east - b.west) * i) / cols;
      const p = latLngToVector3(lat, lng, radius);
      positions.push(p.x, p.y, p.z);
      p.normalize();
      normals.push(p.x, p.y, p.z);
      uvs.push((b.uSpan * i) / cols, 1 - (b.vSpan * j) / rows);
      globalUvs.push((lng + 180) / 360, (lat + 90) / 180);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b2 = a + 1, c = a + cols + 1, d = c + 1;
      index.push(a, c, b2, b2, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('globalUv', new Float32BufferAttribute(globalUvs, 2));
  return geometry;
};
