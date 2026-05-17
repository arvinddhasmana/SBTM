import { Test, TestingModule } from '@nestjs/testing';
import { SchoolBoardService } from './school-board.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchoolBoard } from '../auth/entities/school-board.entity';
import { NotFoundException } from '@nestjs/common';

describe('SchoolBoardService', () => {
    let service: SchoolBoardService;

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
                SchoolBoardService,
                {
                    provide: getRepositoryToken(SchoolBoard),
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<SchoolBoardService>(SchoolBoardService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('creates and returns a new board', async () => {
            const created = { id: 'b-1', name: 'Test Board' };
            mockRepo.create.mockReturnValue(created);
            mockRepo.save.mockResolvedValue(created);

            const result = await service.create({ name: 'Test Board' });
            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Test Board' });
            expect(mockRepo.save).toHaveBeenCalledWith(created);
        });
    });

    describe('update', () => {
        it('updates an existing board name', async () => {
            const existing = { id: 'b-1', name: 'Old Name', schools: [] };
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.save.mockResolvedValue({ ...existing, name: 'New Name' });

            const result = await service.update('b-1', { name: 'New Name' });
            expect(result.name).toBe('New Name');
        });

        it('throws NotFoundException when board id does not exist', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(service.update('ghost', { name: 'x' })).rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('removes an existing board', async () => {
            const existing = { id: 'b-2', name: 'To Remove', schools: [] };
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.remove.mockResolvedValue(undefined);

            await expect(service.remove('b-2')).resolves.toBeUndefined();
            expect(mockRepo.remove).toHaveBeenCalledWith(existing);
        });

        it('throws NotFoundException when board id does not exist', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
        });
    });
});
