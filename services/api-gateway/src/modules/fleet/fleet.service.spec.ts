import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FleetService } from './fleet.service';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';
import { Run } from './entities/run.entity';

/**
 * v2 FleetService — vehicles belong to an Operator (operatorId, not schoolId).
 * "Active route" → "vehicle has a Run row" (uses runRepository instead of routeRepository).
 */
describe('FleetService (v2 — operator-scoped)', () => {
  let service: FleetService;

  const mockVehicleRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
  const mockRunRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepo },
        { provide: getRepositoryToken(Run), useValue: mockRunRepo },
      ],
    }).compile();
    service = module.get<FleetService>(FleetService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a vehicle when the operator+plate pair is unused', async () => {
      const dto = {
        licensePlate: 'BUS-1',
        operatorId: 'op-1',
        status: VehicleStatus.ACTIVE,
      };
      mockVehicleRepo.findOne.mockResolvedValue(null);
      mockVehicleRepo.create.mockReturnValue(dto);
      mockVehicleRepo.save.mockResolvedValue({ id: 'v-uuid', ...dto });

      const out = await service.create(dto as never);

      expect(mockVehicleRepo.findOne).toHaveBeenCalledWith({
        where: { operatorId: 'op-1', licensePlate: 'BUS-1' },
      });
      expect(out.id).toBe('v-uuid');
      expect(mockVehicleRepo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when plate is already used by the same operator', async () => {
      mockVehicleRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({
          licensePlate: 'BUS-1',
          operatorId: 'op-1',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('lists vehicles scoped to the caller operator', async () => {
      mockVehicleRepo.find.mockResolvedValue([
        { id: 'v-1', operatorId: 'op-1' },
      ]);
      const out = await service.findAll('op-1');
      expect(mockVehicleRepo.find).toHaveBeenCalledWith({
        where: { operatorId: 'op-1' },
      });
      expect(out).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns the vehicle when found under the operator', async () => {
      mockVehicleRepo.findOne.mockResolvedValue({
        id: 'v-1',
        operatorId: 'op-1',
      });
      const out = await service.findOne('v-1', 'op-1');
      expect(mockVehicleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'v-1', operatorId: 'op-1' },
      });
      expect(out.id).toBe('v-1');
    });

    it('throws NotFoundException when not under the caller operator', async () => {
      mockVehicleRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('v-1', 'op-other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('applies the patch when plate is unchanged', async () => {
      const existing = {
        id: 'v-1',
        operatorId: 'op-1',
        licensePlate: 'BUS-1',
      };
      mockVehicleRepo.findOne.mockResolvedValue(existing);
      mockVehicleRepo.save.mockImplementation(async (v) => v);

      const out = await service.update('v-1', 'op-1', {
        capacitySeated: 40,
      } as never);
      expect(out.capacitySeated).toBe(40);
    });

    it('throws ConflictException when renaming plate collides with another vehicle', async () => {
      const existing = {
        id: 'v-1',
        operatorId: 'op-1',
        licensePlate: 'BUS-1',
      };
      mockVehicleRepo.findOne
        .mockResolvedValueOnce(existing) // findOne via service.findOne
        .mockResolvedValueOnce({ id: 'v-other' }); // dup check

      await expect(
        service.update('v-1', 'op-1', {
          licensePlate: 'BUS-2',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('removes the vehicle when no runs reference it', async () => {
      const vehicle = { id: 'v-1', operatorId: 'op-1' };
      mockVehicleRepo.findOne.mockResolvedValue(vehicle);
      mockRunRepo.find.mockResolvedValue([]);

      await service.remove('v-1', 'op-1');
      expect(mockVehicleRepo.remove).toHaveBeenCalledWith(vehicle);
    });

    it('throws BadRequestException when vehicle is assigned to runs', async () => {
      mockVehicleRepo.findOne.mockResolvedValue({
        id: 'v-1',
        operatorId: 'op-1',
      });
      mockRunRepo.find.mockResolvedValue([{ id: 'run-1' }]);

      await expect(service.remove('v-1', 'op-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
