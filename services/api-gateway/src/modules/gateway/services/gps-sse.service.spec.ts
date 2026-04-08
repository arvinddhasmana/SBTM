import { Test, TestingModule } from '@nestjs/testing';
import { GpsSseService, GpsLocationPayload } from './gps-sse.service';
import { ConfigService } from '@nestjs/config';
import { Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

// Mock IORedis so no real connection is attempted in unit tests
const mockRedisInstance = {
  on: jest.fn(),
  subscribe: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockRedisInstance),
}));

describe('GpsSseService', () => {
  let service: GpsSseService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, def: unknown) => {
      if (key === 'redisHost') return 'localhost';
      if (key === 'redisPort') return 6379;
      return def;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsSseService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GpsSseService>(GpsSseService);
    // Initialise subscriber without real Redis
    service.onApplicationBootstrap();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.onApplicationShutdown();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStream', () => {
    it('should return an Observable', () => {
      const stream$ = service.getStream('ROUTE-AM');
      expect(typeof stream$.subscribe).toBe('function');
    });

    it('should emit an event to a subscriber for the matching route', (done) => {
      const stream$ = service.getStream('ROUTE-AM');
      const received: MessageEvent[] = [];

      const sub = stream$.subscribe((event) => {
        received.push(event);
      });

      const payload: GpsLocationPayload = {
        vehicleId: 'BUS-001',
        routeId: 'ROUTE-AM',
        lat: 45.42,
        lng: -75.69,
        speedKph: 40,
        headingDeg: 90,
        timestamp: '2026-04-08T08:00:00.000Z',
      };

      service.handleLocationMessage(JSON.stringify(payload));

      // Allow microtasks to flush
      setImmediate(() => {
        expect(received).toHaveLength(1);
        const data = received[0].data as {
          routeId: string;
          vehicleId: string;
          lastUpdate: string;
          position: { lat: number; lng: number };
          speedKph?: number;
          headingDeg?: number;
        };
        expect(data.routeId).toBe('ROUTE-AM');
        expect(data.vehicleId).toBe('BUS-001');
        expect(data.position).toEqual({ lat: 45.42, lng: -75.69 });
        expect(data.lastUpdate).toBe('2026-04-08T08:00:00.000Z');
        expect(data.speedKph).toBe(40);
        sub.unsubscribe();
        done();
      });
    });

    it('should NOT emit events for a different route (tenant isolation)', (done) => {
      const amStream$ = service.getStream('ROUTE-AM');
      const received: MessageEvent[] = [];

      const sub = amStream$.subscribe((e) => received.push(e));

      const payload: GpsLocationPayload = {
        vehicleId: 'BUS-002',
        routeId: 'ROUTE-PM', // different route
        lat: 45.43,
        lng: -75.7,
        timestamp: '2026-04-08T15:00:00.000Z',
      };

      service.handleLocationMessage(JSON.stringify(payload));

      setImmediate(() => {
        expect(received).toHaveLength(0); // no cross-route leakage
        sub.unsubscribe();
        done();
      });
    });

    it('should clean up subject map when subscriber unsubscribes', () => {
      // Access private map via type cast for testing
      const routeSubjects = (
        service as unknown as {
          routeSubjects: Map<string, Set<Subject<MessageEvent>>>;
        }
      ).routeSubjects;

      const sub = service.getStream('ROUTE-CLEANUP').subscribe(() => {});
      expect(routeSubjects.has('ROUTE-CLEANUP')).toBe(true);

      sub.unsubscribe();

      // After teardown the route entry must be removed
      expect(routeSubjects.has('ROUTE-CLEANUP')).toBe(false);
    });

    it('should support multiple subscribers for the same route', (done) => {
      const received1: MessageEvent[] = [];
      const received2: MessageEvent[] = [];

      const sub1 = service
        .getStream('ROUTE-MULTI')
        .subscribe((e) => received1.push(e));
      const sub2 = service
        .getStream('ROUTE-MULTI')
        .subscribe((e) => received2.push(e));

      const payload: GpsLocationPayload = {
        vehicleId: 'BUS-003',
        routeId: 'ROUTE-MULTI',
        lat: 45.44,
        lng: -75.71,
        timestamp: '2026-04-08T08:05:00.000Z',
      };

      service.handleLocationMessage(JSON.stringify(payload));

      setImmediate(() => {
        expect(received1).toHaveLength(1);
        expect(received2).toHaveLength(1);
        sub1.unsubscribe();
        sub2.unsubscribe();
        done();
      });
    });
  });

  describe('handleLocationMessage', () => {
    it('should silently ignore malformed JSON', () => {
      expect(() => service.handleLocationMessage('not-json')).not.toThrow();
    });

    it('should silently ignore messages for routes with no subscribers', () => {
      const payload: GpsLocationPayload = {
        vehicleId: 'BUS-099',
        routeId: 'ROUTE-NOBODY',
        lat: 45.0,
        lng: -75.0,
        timestamp: '2026-04-08T08:00:00.000Z',
      };
      expect(() =>
        service.handleLocationMessage(JSON.stringify(payload)),
      ).not.toThrow();
    });
  });
});
