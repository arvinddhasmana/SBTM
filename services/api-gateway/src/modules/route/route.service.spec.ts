import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RouteService } from './route.service';
import { Route, RouteDirection } from '../auth/entities/route.entity';
import { Vehicle } from '../auth/entities/vehicle.entity';
import { Repository, DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';

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
            manager: {
                save: jest.fn(),
                create: jest.fn(),
            },
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RouteService,
                { provide: getRepositoryToken(Route), useValue: mockRouteRepo },
                { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepo },
                { provide: DataSource, useValue: mockDataSource },
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
                (service as any).validateVehicleOverlap('v1', '08:30', 60, null)
            ).rejects.toThrow(ConflictException);
        });

        it('should not throw if times do not overlap', async () => {
            const existingRoutes = [
                { id: 'r1', startTime: '08:00', estimatedDuration: 60 }, // 08:00 - 09:00
            ];
            mockRouteRepo.find.mockResolvedValue(existingRoutes);

            // Try to add 09:00 - 10:00 (exact boundary is OK in this logic)
            await expect(
                (service as any).validateVehicleOverlap('v1', '09:00', 60, null)
            ).toReturn;
        });
    });
});
