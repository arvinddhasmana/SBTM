import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OptimizationService } from './optimization.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: string) => {
    if (key === 'OSRM_BASE_URL') return 'http://mock-osrm.test';
    return defaultVal;
  }),
};

describe('OptimizationService (Unit)', () => {
  let service: OptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OptimizationService>(OptimizationService);
    jest.clearAllMocks();
  });

  describe('optimizeStops', () => {
    const stopsWithCoords = [
      { sequence: 0, address: 'Stop A', location: 'POINT(-79.3832 43.6532)' },
      { sequence: 1, address: 'Stop B', location: 'POINT(-79.4100 43.6700)' },
    ];

    it('should return real OSRM result when provider responds successfully', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: {
          code: 'Ok',
          routes: [
            {
              distance: 3500, // metres
              duration: 480, // seconds
              geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', // sample polyline
              legs: [],
            },
          ],
          waypoints: [
            {
              waypoint_index: 0,
              location: [-79.3832, 43.6532],
              name: 'Stop A',
            },
            { waypoint_index: 1, location: [-79.41, 43.67], name: 'Stop B' },
          ],
        },
      });

      const result = await service.optimizeStops(stopsWithCoords);

      expect(result.totalDistance).toBe(3.5);
      expect(result.totalDuration).toBe(8);
      expect(result.polylineGeoJson).not.toBeNull();
      expect(result.polylineGeoJson?.type).toBe('LineString');
      expect(result.polyline).toBeTruthy();
    });

    it('should return fallback result when OSRM returns non-Ok code', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { code: 'NoRoute', routes: [], waypoints: [] },
      });

      const result = await service.optimizeStops(stopsWithCoords);

      expect(result.polylineGeoJson).toBeNull();
      expect(result.totalDistance).toBe(0);
    });

    it('should return fallback result when OSRM call throws a network error', async () => {
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.optimizeStops(stopsWithCoords);

      expect(result.polylineGeoJson).toBeNull();
      expect(result.optimizedStops).toHaveLength(2);
    });

    it('should return fallback when stops have invalid WKT location', async () => {
      const stopsNoCoords = [
        { sequence: 0, address: 'Address A', location: 'INVALID' },
        { sequence: 1, address: 'Address B', location: '' },
      ];

      const result = await service.optimizeStops(stopsNoCoords);

      expect(result.polylineGeoJson).toBeNull();
      expect(result.optimizedStops).toHaveLength(2);
    });

    it('should return fallback when fewer than 2 stops are provided', async () => {
      const result = await service.optimizeStops([
        {
          sequence: 0,
          address: 'Only Stop',
          location: 'POINT(-79.3832 43.6532)',
        },
      ]);

      expect(result.polylineGeoJson).toBeNull();
      expect(result.optimizedStops).toHaveLength(1);
      // OSRM should NOT have been called
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
