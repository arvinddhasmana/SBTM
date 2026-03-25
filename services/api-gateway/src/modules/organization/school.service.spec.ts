import { Test, TestingModule } from '@nestjs/testing';
import { SchoolService } from './school.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { School } from '../auth/entities/school.entity';
import { NotFoundException } from '@nestjs/common';

describe('SchoolService', () => {
    let service: SchoolService;

    const mockRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchoolService,
                {
                    provide: getRepositoryToken(School),
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<SchoolService>(SchoolService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('creates and returns a new school with boardId', async () => {
            const created = { id: 's-1', name: 'Test School', boardId: 'b-1' };
            mockRepo.create.mockReturnValue(created);
            mockRepo.save.mockResolvedValue(created);

            const result = await service.create({ name: 'Test School', boardId: 'b-1' });
            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Test School', boardId: 'b-1' });
        });
    });

    describe('findByBoard - tenant isolation', () => {
        it('returns only schools for the given boardId', async () => {
            mockRepo.find.mockResolvedValue([{ id: 's-1', boardId: 'b-1' }]);
            const result = await service.findByBoard('b-1');
            expect(mockRepo.find).toHaveBeenCalledWith({ where: { boardId: 'b-1' } });
            expect(result[0].boardId).toBe('b-1');
        });
    });

    describe('update', () => {
        it('updates an existing school', async () => {
            const existing = { id: 's-1', name: 'Old Name', boardId: 'b-1' };
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.save.mockResolvedValue({ ...existing, name: 'New Name' });

            const result = await service.update('s-1', { name: 'New Name' });
            expect(result.name).toBe('New Name');
        });

        it('throws NotFoundException when school does not exist', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(service.update('ghost', { name: 'x' })).rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('removes an existing school', async () => {
            const existing = { id: 's-2', name: 'To Remove', boardId: 'b-1' };
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.remove.mockResolvedValue(undefined);

            await expect(service.remove('s-2')).resolves.toBeUndefined();
        });

        it('throws NotFoundException when school does not exist', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
        });
    });
});
