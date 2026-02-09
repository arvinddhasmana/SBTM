import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FleetService } from './fleet.service';
import { Vehicle, VehicleStatus } from '../auth/entities/vehicle.entity';
import { Route } from '../auth/entities/route.entity';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('FleetService (Unit)', () => {
    let service: FleetService;
    let vehicleRepo: Repository<Vehicle>;
    let routeRepo: Repository<Route>;

    const mockVehicleRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        remove: jest.fn(),
    };

    const mockRouteRepo = {
        find: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FleetService,
                {
                    provide: getRepositoryToken(Vehicle),
                    useValue: mockVehicleRepo,
                },
                {
                    provide: getRepositoryToken(Route),
                    useValue: mockRouteRepo,
                },
            ],
        }).compile();

        service = module.get<FleetService>(FleetService);
        vehicleRepo = module.get<Repository<Vehicle>>(getRepositoryToken(Vehicle));
        routeRepo = module.get<Repository<Route>>(getRepositoryToken(Route));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a vehicle if it does not exist', async () => {
            const dto = { licensePlate: 'BUS-1', schoolId: 'school-1', status: VehicleStatus.ACTIVE };
            mockVehicleRepo.findOne.mockResolvedValue(null);
            mockVehicleRepo.create.mockReturnValue(dto);
            mockVehicleRepo.save.mockResolvedValue({ id: 'uuid', ...dto });

            const result = await service.create(dto);
            expect(result.id).toBe('uuid');
            expect(mockVehicleRepo.save).toHaveBeenCalled();
        });

        it('should throw ConflictException if vehicle plate exists in school', async () => {
            const dto = { licensePlate: 'BUS-1', schoolId: 'school-1' };
            mockVehicleRepo.findOne.mockResolvedValue({ id: 'existing' });

            await expect(service.create(dto as any)).rejects.toThrow(ConflictException);
        });
    });

    describe('remove', () => {
        it('should remove vehicle if no active routes', async () => {
            const vehicle = { id: 'v1', schoolId: 's1' };
            mockVehicleRepo.findOne.mockResolvedValue(vehicle);
            mockRouteRepo.find.mockResolvedValue([]);

            await service.remove('v1', 's1');
            expect(mockVehicleRepo.remove).toHaveBeenCalledWith(vehicle);
        });

        it('should throw BadRequestException if vehicle has active routes', async () => {
            const vehicle = { id: 'v1', schoolId: 's1' };
            mockVehicleRepo.findOne.mockResolvedValue(vehicle);
            mockRouteRepo.find.mockResolvedValue([{ id: 'route1' }]);

            await expect(service.remove('v1', 's1')).rejects.toThrow(BadRequestException);
        });
    });
});
