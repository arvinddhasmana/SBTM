import { StubOsrmClient } from './osrm-client';
import { ShapeFallbackWorker } from './shape-fallback.worker';

describe('ShapeFallbackWorker (slice 3)', () => {
  it('generates a sbtm_generated shape for each route with >=2 stops', async () => {
    const worker = new ShapeFallbackWorker(new StubOsrmClient());
    const out = await worker.runOnce([
      {
        staRouteNumber: 'R-OCDSB-101',
        stops: [
          { lat: 45.4215, lon: -75.6972 },
          { lat: 45.4225, lon: -75.698 },
          { lat: 45.4235, lon: -75.699 },
        ],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].shapeSource).toBe('sbtm_generated');
    expect(out[0].shapeId).toBe('gen-R-OCDSB-101');
    expect(out[0].points).toHaveLength(3);
    expect(out[0].points[0].shapePtSequence).toBe(1);
  });

  it('skips routes with fewer than 2 stops', async () => {
    const worker = new ShapeFallbackWorker(new StubOsrmClient());
    const out = await worker.runOnce([
      { staRouteNumber: 'R-SOLO', stops: [{ lat: 45, lon: -75 }] },
    ]);
    expect(out).toEqual([]);
  });
});
