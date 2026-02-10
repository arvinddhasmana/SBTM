import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InspectionService } from './inspection.service';
import { VehicleInspection, InspectionType } from './entities/vehicle-inspection.entity';

describe('InspectionService', () => {
    let service: InspectionService;
    let repository: any;

    const mockRepository = {
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockImplementation(inspection => Promise.resolve({ id: 'uuid', ...inspection })),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InspectionService,
                {
                    provide: getRepositoryToken(VehicleInspection),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<InspectionService>(InspectionService);
        repository = module.get(getRepositoryToken(VehicleInspection));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create an inspection', async () => {
        const dto = { vehicle_id: 'v1', driver_id: 'd1', school_id: 's1', is_passed: true };
        const result = await service.create(dto);
        expect(result).toEqual({ id: 'uuid', ...dto });
        expect(repository.create).toHaveBeenCalledWith(dto);
        expect(repository.save).toHaveBeenCalled();
    });

    it('should find all inspections for a school', async () => {
        const inspections = [{ id: '1' }, { id: '2' }];
        repository.find.mockResolvedValue(inspections);
        const result = await service.findAll('s1');
        expect(result).toEqual(inspections);
        expect(repository.find).toHaveBeenCalledWith({
            where: { school_id: 's1' },
            order: { createdAt: 'DESC' },
        });
    });
});
