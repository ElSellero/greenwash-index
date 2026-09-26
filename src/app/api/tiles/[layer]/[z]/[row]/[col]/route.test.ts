import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const call = (layer: string, z: string, row: string, col: string) =>
  GET(new Request(`http://localhost/api/tiles/${layer}/${z}/${row}/${col}`), {
    params: Promise.resolve({ layer, z, row, col }),
  });

const upstream = (body: string, init: ResponseInit) =>
  vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(body, init));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('GET /api/tiles/[layer]/[z]/[row]/[col]', () => {
  it('serves the NASA tile from our own origin with a long CDN cache', async () => {
    const fetchMock = upstream('jpeg-bytes', { status: 200, headers: { 'content-type': 'image/jpeg' } });
    vi.stubGlobal('fetch', fetchMock);
    const res = await call('night', '7', '20', '83');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('jpeg-bytes');
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toContain('s-maxage=31536000');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_CityLights_2012/default/2012-01-01/500m/7/20/83.jpeg');
  });

  it('refuses anything that is not a known layer and in-range tile, without calling upstream', async () => {
    const fetchMock = upstream('x', { status: 200, headers: { 'content-type': 'image/jpeg' } });
    vi.stubGlobal('fetch', fetchMock);
    for (const [layer, z, row, col] of [['sat', '7', '20', '83'], ['day', '9', '0', '0'], ['day', '7', '20', '999']]) {
      expect((await call(layer!, z!, row!, col!)).status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a bad gateway, uncached, when NASA answers with an error or a non-image', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', upstream('<ExceptionReport/>', { status: 200, headers: { 'content-type': 'text/xml' } }));
    const wrongType = await call('day', '7', '20', '83');
    expect(wrongType.status).toBe(502);
    expect(wrongType.headers.get('cache-control')).toBe('no-store');
    vi.stubGlobal('fetch', upstream('nope', { status: 503 }));
    expect((await call('day', '7', '20', '83')).status).toBe(502);
  });

  it('reports a bad gateway when NASA is unreachable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    expect((await call('day', '7', '20', '83')).status).toBe(502);
  });
});
