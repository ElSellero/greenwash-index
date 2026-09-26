import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

type Draw = (g: CanvasRenderingContext2D, size: number) => void;

const paint = (size: number, draw: Draw): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const glow: Draw = (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,0.9)');
  r.addColorStop(0.22, 'rgba(255,255,255,0.35)');
  r.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
};

const ring: Draw = (g, s) => {
  g.strokeStyle = '#fff';
  g.lineWidth = s * 0.05;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
  g.stroke();
};

const reticle: Draw = (g, s) => {
  g.strokeStyle = '#fff';
  g.lineWidth = s * 0.045;
  g.lineCap = 'round';
  const m = s * 0.12, l = s * 0.22;
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [s - m, m, -1, 1], [m, s - m, 1, -1], [s - m, s - m, -1, -1]] as const) {
    g.beginPath();
    g.moveTo(x, y + dy * l);
    g.lineTo(x, y);
    g.lineTo(x + dx * l, y);
    g.stroke();
  }
};

const dot: Draw = (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.45, 'rgba(255,255,255,0.8)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
};

let cache: Record<'glow' | 'ring' | 'reticle' | 'dot', Texture> | null = null;

export const markerTextures = () => {
  cache ??= { glow: paint(128, glow), ring: paint(128, ring), reticle: paint(128, reticle), dot: paint(32, dot) };
  return cache;
};
