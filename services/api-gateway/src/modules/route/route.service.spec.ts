import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, NotImplementedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RouteService } from './route.service';
import { Route } from '../gtfs/entities/route.entity';
import { Trip } from '../gtfs/entities/trip.entity';
import { Shape } from '../gtfs/entities/shape.entity';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';

/**
 * v2 RouteService is a thin TypeORM wrapper around GTFS `routes` + `trips` + `shapes`.
 * The v1 spec exercised `validateVehicleOverlap` (private method, gone in v2) and a
 * v1-shaped `create` (now 501). This v2 spec covers the implemented read paths
 * (`findAll`, `findOne`, `getShapeForRoute`, `remove`) plus the 501 contract on the
 * write paths so the stubs are locked in until phase-B wires them up.
 */
describe('RouteService (v2)', () => {
  let service: RouteService;
  let routeRepo: jest.Mocked<Repository<Route>>;
  let tripRepo: jest.Mocked<Repository<Trip>>;
  let shapeRepo: jest.Mocked<Repository<Shape>>;
  let notifier: { notifyRouteChange: jest.Mock };

  beforeEach(async () => {
    const mockRouteRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
    };
    const mockTripRepo = { findOne: jest.fn() };
    const mockShapeRepo = { find: jest.fn() };
    notifier = { notifyRouteChange: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        { provide: getRepositoryToken(Route), useValue: mockRouteRepo },
        { provide: getRepositoryToken(Trip), useValue: mockTripRepo },
        { provide: getRepositoryToken(Shape), useValue: mockShapeRepo },
        { provide: RouteChangeNotifierService, useValue: notifier },
      ],
    }).compile();

    service = module.get(RouteService);
    routeRepo = module.get(getRepositoryToken(Route));
    tripRepo = module.get(getRepositoryToken(Trip));
    shapeRepo = module.get(getRepositoryToken(Shape));
    jest.clearAllMocks();
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
      expect(routeRepo.findOne).toHaveBeenCalledWith({
        where: { routeId: 'R-OCSB-201', stxSchoolId: 'school-1' },
      });
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
      expect(shapeRepo.find).not.toHaveBeenCalled();
    });

    it('loads shape points ordered by sequence', async () => {
      tripRepo.findOne.mockResolvedValue({
        tripId: 'T-1',
        shapeId: 'SHP-1',
      } as Trip);
      const pts = [
        { shapeId: 'SHP-1', shapePtSequence: 1 } as Shape,
        { shapeId: 'SHP-1', shapePtSequence: 2 } as Shape,
      ];
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
      expect(routeRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('phase-B write stubs', () => {
    it('create throws NotImplementedException until wired to GTFS multi-trip payload', async () => {
      await expect(service.create({} as never)).rejects.toThrow(
        NotImplementedException,
      );
    });

    it('update throws NotImplementedException but still emits a route-change notification', async () => {
      await expect(
        service.update('R-OCSB-201', 'school-1', {} as never),
      ).rejects.toThrow(NotImplementedException);
      expect(notifier.notifyRouteChange).toHaveBeenCalledWith(
        'R-OCSB-201',
        'Route details updated',
        'school-1',
      );
    });
  });
});
