import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StudentService } from './student.service';
import { Student, StudentStatus } from './entities/student.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

const mockStudentRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
    })),
    manager: {
        connection: {
            createQueryRunner: jest.fn(() => ({
                connect: jest.fn(),
                startTransaction: jest.fn(),
                commitTransaction: jest.fn(),
                rollbackTransaction: jest.fn(),
                release: jest.fn(),
                manager: {
                    save: jest.fn(),
                },
            })),
        },
    },
});

describe('StudentService', () => {
    let service: StudentService;
    let repository: Repository<Student>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StudentService,
                {
                    provide: getRepositoryToken(Student),
                    useFactory: mockStudentRepository,
                },
            ],
        }).compile();

        service = module.get<StudentService>(StudentService);
        repository = module.get<Repository<Student>>(getRepositoryToken(Student));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create and save a student', async () => {
            const dto = { first_name: 'John', last_name: 'Doe', grade: 'K', school_id: 'school-1' };
            const student = { id: 'uuid', ...dto };
            (repository.create as jest.Mock).mockReturnValue(student);
            (repository.save as jest.Mock).mockReturnValue(student);

            const result = await service.create(dto as any);
            expect(result).toEqual(student);
            expect(repository.create).toHaveBeenCalledWith(dto);
            expect(repository.save).toHaveBeenCalledWith(student);
        });
    });

    describe('findOne', () => {
        it('should return a student if found', async () => {
            const student = { id: 'uuid', first_name: 'John' };
            (repository.findOne as jest.Mock).mockReturnValue(student);

            expect(await service.findOne('uuid')).toEqual(student);
        });

        it('should throw NotFoundException if student not found', async () => {
            (repository.findOne as jest.Mock).mockReturnValue(null);
            await expect(service.findOne('uuid')).rejects.toThrow(NotFoundException);
        });
    });

    describe('assignRoute', () => {
        it('should update route assignments', async () => {
            const student = { id: 'uuid', school_id: 'school-1' };
            const assignment = { am_route_id: 'route-am', pm_route_id: 'route-pm' };
            (repository.findOne as jest.Mock).mockReturnValue(student);
            (repository.save as jest.Mock).mockReturnValue({ ...student, ...assignment });

            const result = await service.assignRoute('uuid', assignment);
            expect(result.am_route_id).toBe('route-am');
            expect(result.pm_route_id).toBe('route-pm');
        });
    });
});
