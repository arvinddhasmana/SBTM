import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ParentGatewayService } from './parent.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { PII_CRYPTO } from './pii-crypto.provider';

describe('ParentGatewayService (v2)', () => {
  let service: ParentGatewayService;
  let httpClient: { get: jest.Mock };
  let dsQuery: jest.Mock;

  const config = {
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'ALERTS_SERVICE_URL') return 'http://alerts-service:3003';
      throw new Error(`Config key ${key} not found`);
    }),
  };

  const parentUser = { id: 'user-1' };

  const GUARDIAN_ROW = [{ id: 'grd-1' }];
  const STUDENT_LINKS = [{ student_id: 'student-1' }];
  const STUDENT_ROWS = [
    {
      id: 'student-1',
      school_id: 'school-1',
      grade: 'K',
      legal_name: null,
      preferred_name: null,
      external_ids: { board_student_number: 'OCSB-001' },
    },
  ];
  const SCHOOL_ROWS = [{ id: 'school-1', name: 'St. Bernadette' }];
  const AM_RIDERSHIP = [
    {
      student_id: 'student-1',
      route_id: 'R-AM',
      route_name: 'AM Loop',
      direction_id: 0,
      stop_id: 'stop-am',
    },
  ];
  const PM_RIDERSHIP = [
    {
      student_id: 'student-1',
      route_id: 'R-PM',
      route_name: 'PM Loop',
      direction_id: 1,
      stop_id: 'stop-pm',
    },
  ];

  // Queues the 6 sequential DataSource.query calls made by getChildrenForParent.
  function setupChildrenQueries(
    opts: {
      ridershipRows?: unknown[];
      boardingRows?: unknown[];
    } = {},
  ): void {
    dsQuery
      .mockResolvedValueOnce(GUARDIAN_ROW) // stx_guardians lookup
      .mockResolvedValueOnce(STUDENT_LINKS) // stx_student_guardians
      .mockResolvedValueOnce(STUDENT_ROWS) // stx_students
      .mockResolvedValueOnce(SCHOOL_ROWS) // stx_schools
      .mockResolvedValueOnce(opts.ridershipRows ?? AM_RIDERSHIP) // stx_ridership join
      .mockResolvedValueOnce(opts.boardingRows ?? []); // stx_boarding_events
  }

  beforeEach(async () => {
    httpClient = { get: jest.fn() };
    dsQuery = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentGatewayService,
        { provide: HttpClientService, useValue: httpClient },
        { provide: ConfigService, useValue: config },
        { provide: DataSource, useValue: { query: dsQuery } },
        { provide: PII_CRYPTO, useValue: null },
      ],
    }).compile();
    service = module.get(ParentGatewayService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChildrenForParent', () => {
    it('queries DB via guardian→student chain and uses board_student_number as name fallback', async () => {
      setupChildrenQueries();
      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'student-1',
        name: 'Student OCSB-001',
        schoolName: 'St. Bernadette',
        amRouteId: 'R-AM',
        amRouteName: 'AM Loop',
        amStopId: 'stop-am',
      });
      expect(result[0].vehicleId).toBeUndefined();
      expect(result[0].avatarUrl).toMatch(/^data:image\/svg\+xml/);
      // v2 fetches students directly from DB — no student HTTP service call
      expect(httpClient.get).not.toHaveBeenCalled();
    });

    it('maps AM (direction_id=0) and PM (direction_id=1) routes correctly', async () => {
      setupChildrenQueries({
        ridershipRows: [...AM_RIDERSHIP, ...PM_RIDERSHIP],
      });
      const result = await service.getChildrenForParent(parentUser);

      expect(result[0].amRouteId).toBe('R-AM');
      expect(result[0].pmRouteId).toBe('R-PM');
      expect(result[0].amStopId).toBe('stop-am');
      expect(result[0].pmStopId).toBe('stop-pm');
    });

    it('returns [] when no guardian record exists for the user (one DB call only)', async () => {
      dsQuery.mockResolvedValueOnce([]);
      const result = await service.getChildrenForParent(parentUser);
      expect(result).toEqual([]);
      expect(dsQuery).toHaveBeenCalledTimes(1);
    });

    it('returns [] when guardian has no student links (two DB calls only)', async () => {
      dsQuery.mockResolvedValueOnce(GUARDIAN_ROW).mockResolvedValueOnce([]);
      const result = await service.getChildrenForParent(parentUser);
      expect(result).toEqual([]);
      expect(dsQuery).toHaveBeenCalledTimes(2);
    });

    it('decrypts preferred_name when PII provider is available', async () => {
      const pii = { decrypt: jest.fn().mockReturnValue('Alice Smith') };
      const module = await Test.createTestingModule({
        providers: [
          ParentGatewayService,
          { provide: HttpClientService, useValue: httpClient },
          { provide: ConfigService, useValue: config },
          { provide: DataSource, useValue: { query: dsQuery } },
          { provide: PII_CRYPTO, useValue: pii },
        ],
      }).compile();
      const svcWithPii = module.get(ParentGatewayService);
      setupChildrenQueries();
      const result = await svcWithPii.getChildrenForParent(parentUser);
      expect(result[0].name).toBe('Alice Smith');
    });

    it('avatar SVG is deterministic for the same studentId across calls', async () => {
      setupChildrenQueries();
      const r1 = await service.getChildrenForParent(parentUser);
      setupChildrenQueries();
      const r2 = await service.getChildrenForParent(parentUser);
      expect(r1[0].avatarUrl).toBe(r2[0].avatarUrl);
    });
  });

  describe('getChildrenForParent — status derivation', () => {
    it('boarded event → on_bus', async () => {
      setupChildrenQueries({
        boardingRows: [
          {
            studentId: 'student-1',
            eventKind: 'boarded',
            routeId: 'R-AM',
            direction: 'AM',
          },
        ],
      });
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('on_bus');
    });

    it('alighted on AM route → at_school', async () => {
      setupChildrenQueries({
        boardingRows: [
          {
            studentId: 'student-1',
            eventKind: 'alighted',
            routeId: 'R-AM',
            direction: 'AM',
          },
        ],
      });
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('at_school');
    });

    it('alighted on PM route → at_home', async () => {
      setupChildrenQueries({
        boardingRows: [
          {
            studentId: 'student-1',
            eventKind: 'alighted',
            routeId: 'R-PM',
            direction: 'PM',
          },
        ],
      });
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('at_home');
    });

    it('alighted with null direction infers PM from routeId substring → at_home', async () => {
      setupChildrenQueries({
        boardingRows: [
          {
            studentId: 'student-1',
            eventKind: 'alighted',
            routeId: 'R-PM',
            direction: null,
          },
        ],
      });
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('at_home');
    });

    it('no boarding rows → time-based default (at_school or at_home)', async () => {
      setupChildrenQueries({ boardingRows: [] });
      const r = await service.getChildrenForParent(parentUser);
      expect(['at_school', 'at_home']).toContain(r[0].status);
    });

    it('boarding query throws → time-based default rather than propagating error', async () => {
      dsQuery
        .mockResolvedValueOnce(GUARDIAN_ROW)
        .mockResolvedValueOnce(STUDENT_LINKS)
        .mockResolvedValueOnce(STUDENT_ROWS)
        .mockResolvedValueOnce(SCHOOL_ROWS)
        .mockResolvedValueOnce(AM_RIDERSHIP)
        .mockRejectedValueOnce(new Error('boarding DB down'));
      const r = await service.getChildrenForParent(parentUser);
      expect(['at_school', 'at_home']).toContain(r[0].status);
    });
  });

  describe('getNotificationsForParent', () => {
    it('forwards parentUserId only — v2 has no per-user school scoping', async () => {
      httpClient.get.mockResolvedValueOnce([{ id: 'n-1' }]);
      const result = await service.getNotificationsForParent(parentUser);
      expect(result).toEqual([{ id: 'n-1' }]);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/notifications',
        { params: { parentUserId: 'user-1' } },
      );
    });

    it('swallows upstream errors and returns []', async () => {
      httpClient.get.mockRejectedValueOnce(new Error('alerts down'));
      const result = await service.getNotificationsForParent(parentUser);
      expect(result).toEqual([]);
    });
  });

  describe('getAlertStream', () => {
    it('returns a subscribable Observable without throwing on upstream failure', () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, body: null }) as never;
      const stream = service.getAlertStream(parentUser);
      expect(typeof stream.subscribe).toBe('function');
    });
  });
});
