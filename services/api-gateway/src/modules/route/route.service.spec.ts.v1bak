import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RouteService } from './route.service';
import { Route, RouteDirection } from '../auth/entities/route.entity';
import { Vehicle } from '../auth/entities/vehicle.entity';
import { Repository, DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';

describe('RouteService (Unit)', () => {
  let service: RouteService;
  let routeRepo: Repository<Route>;
  let vehicleRepo: Repository<Vehicle>;

  const mockRouteRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockVehicleRepo = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
      manager: {
        save: jest.fn(),
        create: jest.fn(),
      },
    }),
  };

  const mockRouteChangeNotifier = {
    notifyRouteUpdated: jest.fn(),
    notifyRouteDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        { provide: getRepositoryToken(Route), useValue: mockRouteRepo },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepo },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: RouteChangeNotifierService,
          useValue: mockRouteChangeNotifier,
        },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
  });

  describe('validateVehicleOverlap', () => {
    it('should throw ConflictException if times overlap', async () => {
      const existingRoutes = [
        { id: 'r1', startTime: '08:00', estimatedDuration: 60 }, // 08:00 - 09:00
      ];
      mockRouteRepo.find.mockResolvedValue(existingRoutes);

      // Try to add 08:30 - 09:30
      await expect(
        (service as any).validateVehicleOverlap('v1', '08:30', 60, null),
      ).rejects.toThrow(ConflictException);
    });

    it('should not throw if times do not overlap', async () => {
      const existingRoutes = [
        { id: 'r1', startTime: '08:00', estimatedDuration: 60 }, // 08:00 - 09:00
      ];
      mockRouteRepo.find.mockResolvedValue(existingRoutes);

      // Try to add 09:00 - 10:00 (exact boundary is OK in this logic)
      await expect(
        (service as any).validateVehicleOverlap('v1', '09:00', 60, null),
      ).toReturn;
    });
  });

  describe('create', () => {
    it('should create route and insert stops via raw SQL with ST_GeomFromText', async () => {
      const savedRoute = {
        id: 'route-1',
        schoolId: 'school-1',
        name: 'Route A',
      };
      const queryRunner = mockDataSource.createQueryRunner();

      mockRouteRepo.findOne.mockResolvedValueOnce(null); // no existing name
      mockRouteRepo.create.mockReturnValue(savedRoute);
      queryRunner.manager.save.mockResolvedValueOnce(savedRoute);
      queryRunner.query.mockResolvedValue(undefined);
      mockRouteRepo.findOne.mockResolvedValueOnce({
        ...savedRoute,
        stops: [
          {
            id: 's1',
            sequence: 1,
            address: 'Stop A',
            location: { type: 'Point', coordinates: [-75.884, 45.271] },
          },
        ],
      });

      const result = await service.create({
        name: 'Route A',
        direction: 'AM' as any,
        schoolId: 'school-1',
        startTime: '07:30',
        stops: [
          { sequence: 1, address: 'Stop A', location: 'POINT(-75.884 45.271)' },
        ],
      });

      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_GeomFromText'),
        ['route-1', 1, 'Stop A', 'POINT(-75.884 45.271)'],
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.stops).toHaveLength(1);
    });

    it('should rollback on error', async () => {
      const queryRunner = mockDataSource.createQueryRunner();

      mockRouteRepo.findOne.mockResolvedValueOnce(null);
      mockRouteRepo.create.mockReturnValue({ id: 'r1' });
      queryRunner.manager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.create({
          name: 'Route B',
          direction: 'AM' as any,
          schoolId: 'school-1',
          startTime: '07:30',
        }),
      ).rejects.toThrow('DB error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
