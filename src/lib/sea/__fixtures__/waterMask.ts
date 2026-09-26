import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { LatLng } from '@/lib/geo';

/*
 * 2048×1024 equirectangular water mask, 1 bit per pixel (1 = water), rows north→south,
 * derived from the Solar System Scope specular map (CC BY 4.0) that also shades the
 * globe's oceans. One pixel ≈ 20 km.
 */
const MASK_W = 2048;
const MASK_H = 1024;
const mask = gunzipSync(readFileSync(path.join(__dirname, 'water-2048x1024.bin.gz')));

export const isWater = ({ lat, lng }: LatLng): boolean => {
  const row = Math.min(MASK_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MASK_H)));
  const col = ((Math.floor(((lng + 180) / 360) * MASK_W) % MASK_W) + MASK_W) % MASK_W;
  const byte = mask[row * (MASK_W / 8) + (col >> 3)]!;
  return ((byte >> (7 - (col & 7))) & 1) === 1;
};
