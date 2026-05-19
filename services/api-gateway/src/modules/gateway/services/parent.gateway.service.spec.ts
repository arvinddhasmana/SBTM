import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParentGatewayService } from './parent.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { School } from '../../organization/entities/school.entity';
import { Route } from '../../gtfs/entities/route.entity';

/**
 * v2 ParentGatewayService spec — merges the v1 main + status specs into a single
 * file against the v2 entity paths (`organization/School`, `gtfs/Route` with
 * `routeId` PK and `routeShortName`/`routeLongName`). The v2 service no longer
 * surfaces a vehicleId on the route record (phase-B TODO — resolved per-day from
 * `stx_runs`), so the dto's `vehicleId` is always undefined here.
 *
 * v2-followups #1: getNotificationsForParent now passes parentUserId only.
 * Audience resolution lives in the alerts service via stx_alert_subscriptions
 * + Guardian → StudentGuardian → Student joins, so cross-board guardians get
 * all their alerts in one call regardless of any per-user schoolId.
 */
describe('ParentGatewayService (v2)', () => {
  let service: ParentGatewayService;
  let httpClient: { get: jest.Mock };
  const schoolRepo = { findBy: jest.fn() };
  const routeRepo = { findBy: jest.fn() };
  const dataSource = { query: jest.fn() };

  const config = {
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'STUDENT_SERVICE_URL') return 'http://student-service:3006';
      if (key === 'ALERTS_SERVICE_URL') return 'http://alerts-service:3003';
      throw new Error(`Config key ${key} not found`);
    }),
  };

  const parentUser = {
    id: 'parent-1',
    anchorKind: 'parent' as const,
    anchorId: 'grd-1',
  };

  beforeEach(async () => {
    httpClient = { get: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentGatewayService,
        { provide: HttpClientService, useValue: httpClient },
        { provide: ConfigService, useValue: config },
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(School), useValue: schoolRepo },
        { provide: getRepositoryToken(Route), useValue: routeRepo },
      ],
    }).compile();

    service = module.get(ParentGatewayService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChildrenForParent', () => {
    it('proxies to student-service with parent_id and enriches with school + route', async () => {
      httpClient.get.mockResolvedValueOnce([
        {
          id: 'student-1',
          first_name: 'Alice',
          last_name: 'Smith',
          school_id: 'school-1',
          am_route_id: 'R-AM',
          pm_route_id: 'R-PM',
          am_stop_id: 'stop-am',
          pm_stop_id: 'stop-pm',
        },
      ]);
      schoolRepo.findBy.mockResolvedValue([
        { id: 'school-1', name: 'St. Bernadette' },
      ]);
      routeRepo.findBy.mockResolvedValue([
        { routeId: 'R-AM', routeShortName: '101', routeLongName: 'AM Loop' },
        { routeId: 'R-PM', routeShortName: '102', routeLongName: 'PM Loop' },
      ]);
      dataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventKind: 'boarded',
          routeId: 'R-AM',
          direction: 'AM',
        },
      ]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'student-1',
        name: 'Alice Smith',
        schoolName: 'St. Bernadette',
        amRouteId: 'R-AM',
        pmRouteId: 'R-PM',
        amRouteName: '101',
        pmRouteName: '102',
        amStopId: 'stop-am',
        pmStopId: 'stop-pm',
        status: 'on_bus',
      });
      // vehicleId is phase-B TODO — must remain undefined on v2
      expect(result[0].vehicleId).toBeUndefined();
      expect(result[0].avatarUrl).toMatch(/^data:image\/svg\+xml/);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://student-service:3006/students',
        { params: { parent_id: 'parent-1' } },
      );
    });

    it('returns [] when student-service has no children, and skips the presence query', async () => {
      httpClient.get.mockResolvedValueOnce([]);
      const result = await service.getChildrenForParent(parentUser);
      expect(result).toEqual([]);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('issues the same avatar for the same studentId across calls (deterministic by id)', async () => {
      const student = {
        id: 'deterministic-id',
        first_name: 'Sam',
        last_name: 'Lee',
        school_id: 'school-1',
        am_route_id: null,
        pm_route_id: null,
      };
      httpClient.get.mockResolvedValue([student]);
      schoolRepo.findBy.mockResolvedValue([{ id: 'school-1', name: 'School' }]);
      routeRepo.findBy.mockResolvedValue([]);
      dataSource.query.mockResolvedValue([]);

      const r1 = await service.getChildrenForParent(parentUser);
      const r2 = await service.getChildrenForParent(parentUser);
      expect(r1[0].avatarUrl).toBe(r2[0].avatarUrl);
    });
  });

  describe('getChildrenForParent — status derivation', () => {
    const baseStudent = {
      id: 'student-1',
      first_name: 'A',
      last_name: 'B',
      school_id: 'school-1',
      am_route_id: 'R-AM',
      pm_route_id: 'R-PM',
    };

    beforeEach(() => {
      schoolRepo.findBy.mockResolvedValue([{ id: 'school-1', name: 'S' }]);
      routeRepo.findBy.mockResolvedValue([
        { routeId: 'R-AM', routeShortName: 'AM' },
        { routeId: 'R-PM', routeShortName: 'PM' },
      ]);
    });

    it('BOARD → on_bus', async () => {
      httpClient.get.mockResolvedValueOnce([baseStudent]);
      dataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventKind: 'boarded',
          routeId: 'R-AM',
          direction: 'AM',
        },
      ]);
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('on_bus');
    });

    it('ALIGHT on AM route → at_school', async () => {
      httpClient.get.mockResolvedValueOnce([baseStudent]);
      dataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventKind: 'alighted',
          routeId: 'R-AM',
          direction: 'AM',
        },
      ]);
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('at_school');
    });

    it('ALIGHT on PM route → at_home', async () => {
      httpClient.get.mockResolvedValueOnce([baseStudent]);
      dataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventKind: 'alighted',
          routeId: 'R-PM',
          direction: 'PM',
        },
      ]);
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('at_home');
    });

    it('ALIGHT with null direction infers PM from routeId substring', async () => {
      httpClient.get.mockResolvedValueOnce([baseStudent]);
      dataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventKind: 'alighted',
          routeId: 'R-PM',
          direction: null,
        },
      ]);
      const r = await service.getChildrenForParent(parentUser);
      expect(r[0].status).toBe('at_home');
    });

    it('no presence rows → time-based default (at_school OR at_home)', async () => {
      httpClient.get.mockResolvedValueOnce([baseStudent]);
      dataSource.query.mockResolvedValueOnce([]);
      const r = await service.getChildrenForParent(parentUser);
      expect(['at_school', 'at_home']).toContain(r[0].status);
    });

    it('presence query throws → falls back to time-based default rather than failing', async () => {
      httpClient.get.mockResolvedValueOnce([baseStudent]);
      dataSource.query.mockRejectedValueOnce(new Error('boom'));
      const r = await service.getChildrenForParent(parentUser);
      expect(['at_school', 'at_home']).toContain(r[0].status);
    });
  });

  describe('getNotificationsForParent', () => {
    it('forwards parentUserId only (v2: no per-user school scoping)', async () => {
      httpClient.get.mockResolvedValueOnce([{ id: 'n-1' }]);
      const result = await service.getNotificationsForParent(parentUser);
      expect(result).toEqual([{ id: 'n-1' }]);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/notifications',
        { params: { parentUserId: 'parent-1' } },
      );
    });

    it('omits all extra params when only id is provided', async () => {
      httpClient.get.mockResolvedValueOnce([]);
      await service.getNotificationsForParent({ id: 'parent-2' });
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/notifications',
        { params: { parentUserId: 'parent-2' } },
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
