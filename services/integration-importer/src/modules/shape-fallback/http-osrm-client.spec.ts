import { HttpOsrmClient } from './http-osrm-client';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('HttpOsrmClient', () => {
  const stops = [
    { lat: 45.4215, lon: -75.6972 },
    { lat: 45.4225, lon: -75.698 },
  ];

  it('builds the correct OSRM URL and decodes geojson coords', async () => {
    let seenUrl = '';
    const fakeFetch = (async (url: string) => {
      seenUrl = url;
      return jsonResponse({
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: [
                [-75.6972, 45.4215],
                [-75.6976, 45.422],
                [-75.698, 45.4225],
              ],
            },
          },
        ],
      });
    }) as unknown as typeof fetch;

    const client = new HttpOsrmClient('http://osrm:5000/', 'driving', 5000, fakeFetch);
    const out = await client.routeSnappedPath(stops);

    expect(seenUrl).toBe(
      'http://osrm:5000/route/v1/driving/-75.697200,45.421500;-75.698000,45.422500?geometries=geojson&overview=full',
    );
    expect(out).toEqual([
      { shapePtLat: 45.4215, shapePtLon: -75.6972, shapePtSequence: 1, shapeDistTraveled: 0 },
      { shapePtLat: 45.422, shapePtLon: -75.6976, shapePtSequence: 2, shapeDistTraveled: null },
      { shapePtLat: 45.4225, shapePtLon: -75.698, shapePtSequence: 3, shapeDistTraveled: null },
    ]);
  });

  it('returns [] for fewer than 2 input coords (no OSRM call)', async () => {
    const fakeFetch = jest.fn();
    const client = new HttpOsrmClient(
      'http://osrm:5000',
      'driving',
      5000,
      fakeFetch as unknown as typeof fetch,
    );
    expect(await client.routeSnappedPath([{ lat: 1, lon: 2 }])).toEqual([]);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('throws on non-2xx response', async () => {
    const fakeFetch = (async () =>
      new Response('boom', {
        status: 503,
        statusText: 'Service Unavailable',
      })) as unknown as typeof fetch;
    const client = new HttpOsrmClient('http://osrm:5000', 'driving', 5000, fakeFetch);
    await expect(client.routeSnappedPath(stops)).rejects.toThrow(/OSRM 503/);
  });

  it('throws when OSRM returns code != Ok', async () => {
    const fakeFetch = (async () =>
      jsonResponse({ code: 'NoRoute', message: 'no path' })) as unknown as typeof fetch;
    const client = new HttpOsrmClient('http://osrm:5000', 'driving', 5000, fakeFetch);
    await expect(client.routeSnappedPath(stops)).rejects.toThrow(/code=NoRoute/);
  });

  it('throws when geometry is missing', async () => {
    const fakeFetch = (async () =>
      jsonResponse({ code: 'Ok', routes: [{}] })) as unknown as typeof fetch;
    const client = new HttpOsrmClient('http://osrm:5000', 'driving', 5000, fakeFetch);
    await expect(client.routeSnappedPath(stops)).rejects.toThrow(/missing geometry/);
  });
});
