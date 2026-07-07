import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RouteService } from './route.service';
import { Route, ShapeSource } from '../gtfs/entities/route.entity';
import { Trip } from '../gtfs/entities/trip.entity';
import { Shape } from '../gtfs/entities/shape.entity';
import { StopTime } from '../gtfs/entities/stop-time.entity';
import { Stop } from '../gtfs/entities/stop.entity';
import { School } from '../organization/entities/school.entity';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';
import { DirectionKind } from '../gtfs/entities/route.entity';

/**
 * v2 RouteService is now backed by a single-tx GTFS write — one routes row + N
 * trips + N×M stop_times + (optionally) shape rows — so the spec exercises both
 * the simple read paths (findAll/findOne/getShapeForRoute/remove) and the
 * transactional create/update paths against a mocked DataSource.
 */
describe('RouteService (v2)', () => {
  let service: RouteService;
  let routeRepo: jest.Mocked<Repository<Route>>;
  let tripRepo: jest.Mocked<Repository<Trip>>;
  let shapeRepo: jest.Mocked<Repository<Shape>>;
  let notifier: { notifyRouteChange: jest.Mock };
  let dataSource: {
    transaction: jest.Mock;
    getRepository: jest.Mock;
  };

  // per-test mutable handles populated inside beforeEach
  let txRouteRepo: {
    save: jest.Mock;
    update: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let txTripRepo: { save: jest.Mock; delete: jest.Mock };
  let txShapeRepo: { save: jest.Mock };
  let txStopTimeRepo: { save: jest.Mock };
  let txStopRepo: { save: jest.Mock; findOne: jest.Mock };
  let txQuery: jest.Mock;
  let staQbExec: jest.Mock;

  beforeEach(async () => {
    const mockRouteRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
    };
    const mockTripRepo = { findOne: jest.fn() };
    const mockShapeRepo = { find: jest.fn() };
    notifier = { notifyRouteChange: jest.fn().mockResolvedValue(undefined) };

    txRouteRepo = {
      save: jest.fn((r) => Promise.resolve(r)),
      update: jest.fn().mockResolvedValue(undefined),
      findOneOrFail: jest.fn(),
    };
    txTripRepo = {
      save: jest.fn((r) => Promise.resolve(r)),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    txShapeRepo = { save: jest.fn((r) => Promise.resolve(r)) };
    txStopTimeRepo = { save: jest.fn((r) => Promise.resolve(r)) };
    txStopRepo = {
      save: jest.fn((r) => Promise.resolve(r)),
      findOne: jest.fn(),
    };
    txQuery = jest.fn().mockResolvedValue(undefined);

    const txManager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Route) return txRouteRepo;
        if (entity === Trip) return txTripRepo;
        if (entity === Shape) return txShapeRepo;
        if (entity === StopTime) return txStopTimeRepo;
        if (entity === Stop) return txStopRepo;
        throw new Error(`Unexpected entity in tx: ${String(entity)}`);
      }),
      query: txQuery,
    };

    staQbExec = jest.fn().mockResolvedValue({ staId: 'sta-1' });
    const schoolRepoQb = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: staQbExec,
      }),
    };

    dataSource = {
      transaction: jest.fn(async (cb: (m: typeof txManager) => unknown) =>
        cb(txManager),
      ),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === School) return schoolRepoQb;
        throw new Error(`Unexpected ds.getRepository: ${String(entity)}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        { provide: getRepositoryToken(Route), useValue: mockRouteRepo },
        { provide: getRepositoryToken(Trip), useValue: mockTripRepo },
        { provide: getRepositoryToken(Shape), useValue: mockShapeRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: RouteChangeNotifierService, useValue: notifier },
      ],
    }).compile();

    service = module.get(RouteService);
    routeRepo = module.get(getRepositoryToken(Route));
    tripRepo = module.get(getRepositoryToken(Trip));
    shapeRepo = module.get(getRepositoryToken(Shape));
  });

  describe('findAll', () => {
    it('scopes the query to the caller school', async () => {
      const rows = [{ routeId: 'R-OCSB-201' } as Route];
      routeRepo.find.mockResolvedValue(rows);

      const result = await service.findAll('school-1');

      expect(result).toBe(rows);
      expect(routeRepo.find).toHaveBeenCalledWith({
        where: { stxSchoolId: 'school-1' },
      });
    });
  });

  describe('findOne', () => {
    it('returns the route when found inside the caller school scope', async () => {
      const route = {
        routeId: 'R-OCSB-201',
        stxSchoolId: 'school-1',
      } as Route;
      routeRepo.findOne.mockResolvedValue(route);

      const result = await service.findOne('R-OCSB-201', 'school-1');

      expect(result).toBe(route);
    });

    it('throws NotFound when the route is missing or out-of-scope', async () => {
      routeRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('R-X', 'school-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getShapeForRoute', () => {
    it('returns [] when no trip exists for the route', async () => {
      tripRepo.findOne.mockResolvedValue(null);
      expect(await service.getShapeForRoute('R-OCSB-201')).toEqual([]);
      expect(shapeRepo.find).not.toHaveBeenCalled();
    });

    it('returns [] when the trip exists but has no shape_id', async () => {
      tripRepo.findOne.mockResolvedValue({
        tripId: 'T-1',
        shapeId: null,
      } as Trip);
      expect(await service.getShapeForRoute('R-OCSB-201')).toEqual([]);
    });

    it('loads shape points ordered by sequence', async () => {
      tripRepo.findOne.mockResolvedValue({
        tripId: 'T-1',
        shapeId: 'SHP-1',
      } as Trip);
      const pts = [{ shapeId: 'SHP-1', shapePtSequence: 1 } as Shape];
      shapeRepo.find.mockResolvedValue(pts);

      const result = await service.getShapeForRoute('R-OCSB-201');

      expect(result).toBe(pts);
      expect(shapeRepo.find).toHaveBeenCalledWith({
        where: { shapeId: 'SHP-1' },
        order: { shapePtSequence: 'ASC' },
      });
    });
  });

  describe('remove', () => {
    it('soft-removes the in-scope route', async () => {
      const route = {
        routeId: 'R-OCSB-201',
        stxSchoolId: 'school-1',
      } as Route;
      routeRepo.findOne.mockResolvedValue(route);

      await service.remove('R-OCSB-201', 'school-1');

      expect(routeRepo.softRemove).toHaveBeenCalledWith(route);
    });

    it('refuses to remove a route outside the caller school scope', async () => {
      routeRepo.findOne.mockResolvedValue(null);
      await expect(
        service.remove('R-OCSB-201', 'school-other'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create (single-tx route + trips + stop_times)', () => {
    const baseDto = {
      name: 'AM to St. Bernadette',
      direction: DirectionKind.AM,
      schoolId: 'school-1',
      startTime: '08:00',
      stops: [
        {
          stopId: 'STOP-SCHOOL',
          sequence: 1,
          address: 'school',
          location: 'POINT(-75.7 45.4)',
        },
        {
          sequence: 2,
          address: '123 Pickup Ln',
          location: 'POINT(-75.71 45.41)',
        },
      ],
    } as never;

    it('rejects when stops is empty', async () => {
      txStopRepo.findOne.mockResolvedValue({ stopId: 'STOP-SCHOOL' });
      await expect(
        service.create({ ...(baseDto as object), stops: [] } as never),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws NotFound when the school has no STA anchor', async () => {
      staQbExec.mockResolvedValue(null);
      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('writes the route + one synthesised trip + stop_times in a single transaction', async () => {
      txStopRepo.findOne.mockResolvedValue({ stopId: 'STOP-SCHOOL' });

      await service.create(baseDto);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);

      // route row written with resolved STA, school, direction; shape_source=sbtm_generated
      expect(txRouteRepo.save).toHaveBeenCalledTimes(1);
      const savedRoute = txRouteRepo.save.mock.calls[0][0];
      expect(savedRoute).toMatchObject({
        stxStaId: 'sta-1',
        stxSchoolId: 'school-1',
        stxDirectionKind: DirectionKind.AM,
        stxShapeSource: ShapeSource.SBTM_GENERATED,
        routeShortName: 'AM to St. Bernadette',
      });
      expect(savedRoute.routeId).toMatch(/^R-[0-9a-f]{8}$/);

      // one trip (single-trip shortcut from top-level startTime)
      expect(txTripRepo.save).toHaveBeenCalledTimes(1);
      const trip = txTripRepo.save.mock.calls[0][0];
      expect(trip).toMatchObject({
        routeId: savedRoute.routeId,
        serviceId: 'WEEKDAY-2025-26',
        directionId: 0,
      });

      // 2 stop_times, derived from startTime 08:00 + i*120s
      expect(txStopTimeRepo.save).toHaveBeenCalledTimes(1);
      const rows = txStopTimeRepo.save.mock.calls[0][0];
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        stopId: 'STOP-SCHOOL',
        stopSequence: 1,
        arrivalTime: '08:00:00',
        departureTime: '08:00:30',
      });
      expect(rows[1]).toMatchObject({
        stopSequence: 2,
        arrivalTime: '08:02:00',
        departureTime: '08:02:30',
      });
      // second stop had no stopId → minted a new STOP-* id
      expect(rows[1].stopId).toMatch(/^STOP-[0-9a-f]{8}$/);
      // …and a new pickup stop row was written for it
      expect(txStopRepo.save).toHaveBeenCalledTimes(1);
      const newStop = txStopRepo.save.mock.calls[0][0];
      expect(newStop).toMatchObject({
        stopName: '123 Pickup Ln',
        stopLat: 45.41,
        stopLon: -75.71,
        stxSchoolId: 'school-1',
      });
    });

    it('uses STA_IMPORT shape_source when shapeId is supplied (no shape rows written)', async () => {
      txStopRepo.findOne.mockResolvedValue({ stopId: 'STOP-SCHOOL' });

      await service.create({
        ...(baseDto as object),
        shapeId: 'SHP-EXIST',
      } as never);

      const savedRoute = txRouteRepo.save.mock.calls[0][0];
      expect(savedRoute.stxShapeSource).toBe(ShapeSource.STA_IMPORT);
      expect(txShapeRepo.save).not.toHaveBeenCalled();
    });

    it('writes shape points and flags STA_ADMIN_EDITED when shapePoints are supplied', async () => {
      txStopRepo.findOne.mockResolvedValue({ stopId: 'STOP-SCHOOL' });

      await service.create({
        ...(baseDto as object),
        shapePoints: [
          { lat: 45.4, lon: -75.7, sequence: 1 },
          { lat: 45.41, lon: -75.71, sequence: 2 },
        ],
      } as never);

      const savedRoute = txRouteRepo.save.mock.calls[0][0];
      expect(savedRoute.stxShapeSource).toBe(ShapeSource.STA_ADMIN_EDITED);
      expect(txShapeRepo.save).toHaveBeenCalledTimes(1);
      const shapeRows = txShapeRepo.save.mock.calls[0][0];
      expect(shapeRows).toHaveLength(2);
      expect(shapeRows[0]).toMatchObject({
        shapePtSequence: 1,
        shapePtLat: 45.4,
      });
    });

    it('emits one trip per CreateTripDto when trips[] is supplied', async () => {
      txStopRepo.findOne.mockResolvedValue({ stopId: 'STOP-SCHOOL' });

      await service.create({
        ...(baseDto as object),
        startTime: undefined,
        trips: [
          { serviceId: 'SVC-WEEKDAY', startTime: '08:00', directionId: 0 },
          {
            serviceId: 'SVC-EARLY-DISMISS',
            startTime: '12:30',
            directionId: 0,
          },
        ],
      } as never);

      expect(txTripRepo.save).toHaveBeenCalledTimes(2);
      expect(txStopTimeRepo.save).toHaveBeenCalledTimes(2);
      const firstRows = txStopTimeRepo.save.mock.calls[0][0];
      expect(firstRows[0].arrivalTime).toBe('08:00:00');
      const secondRows = txStopTimeRepo.save.mock.calls[1][0];
      expect(secondRows[0].arrivalTime).toBe('12:30:00');
    });

    it('rejects when neither trips[] nor a top-level startTime is provided', async () => {
      txStopRepo.findOne.mockResolvedValue({ stopId: 'STOP-SCHOOL' });
      await expect(
        service.create({
          ...(baseDto as object),
          startTime: undefined,
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const existing = {
      routeId: 'R-OCSB-201',
      stxSchoolId: 'school-1',
      stxDirectionKind: DirectionKind.AM,
      routeLongName: 'old',
    } as Route;

    beforeEach(() => {
      routeRepo.findOne.mockResolvedValue(existing);
      txRouteRepo.findOneOrFail.mockResolvedValue({
        ...existing,
        routeLongName: 'new',
      });
    });

    it('patches only the routes row when payload is name-only', async () => {
      await service.update('R-OCSB-201', 'school-1', { name: 'new' });

      expect(txRouteRepo.update).toHaveBeenCalledWith(
        { routeId: 'R-OCSB-201' },
        { routeShortName: 'new', routeLongName: 'new' },
      );
      expect(txTripRepo.save).not.toHaveBeenCalled();
      expect(txStopTimeRepo.save).not.toHaveBeenCalled();
      expect(txQuery).not.toHaveBeenCalled();
      expect(notifier.notifyRouteChange).toHaveBeenCalledWith(
        'R-OCSB-201',
        'Route details updated',
        'school-1',
      );
    });

    it('rewrites trips + stop_times when startTime is provided with full stops', async () => {
      txStopRepo.findOne.mockResolvedValue({ stopId: 'STOP-SCHOOL' });

      await service.update('R-OCSB-201', 'school-1', {
        startTime: '07:30',
        stops: [
          {
            stopId: 'STOP-SCHOOL',
            sequence: 1,
            address: 'school',
            location: 'POINT(-75.7 45.4)',
          },
        ],
      } as never);

      expect(txQuery).toHaveBeenCalledWith(
        expect.stringMatching(/DELETE FROM stop_times/),
        ['R-OCSB-201'],
      );
      expect(txTripRepo.delete).toHaveBeenCalledWith({ routeId: 'R-OCSB-201' });
      expect(txTripRepo.save).toHaveBeenCalledTimes(1);
      expect(txStopTimeRepo.save).toHaveBeenCalledTimes(1);
      const rows = txStopTimeRepo.save.mock.calls[0][0];
      expect(rows[0].arrivalTime).toBe('07:30:00');
    });

    it('requires full stop list when trips/startTime change', async () => {
      await expect(
        service.update('R-OCSB-201', 'school-1', {
          startTime: '07:30',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound when the route is out-of-scope', async () => {
      routeRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('R-OCSB-201', 'school-other', { name: 'n' }),
      ).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
