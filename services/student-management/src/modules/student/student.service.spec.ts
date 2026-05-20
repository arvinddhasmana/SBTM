import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StudentService } from './student.service';
import { Student } from './entities/student.entity';
import { NotFoundException } from '@nestjs/common';

describe('StudentService', () => {
  let service: StudentService;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;
  let repoFindOne: jest.Mock;
  let repoSoftRemove: jest.Mock;
  let qbAndWhere: jest.Mock;
  let qbGetMany: jest.Mock;
  let managerQuery: jest.Mock;

  beforeEach(async () => {
    repoCreate = jest.fn();
    repoSave = jest.fn();
    repoFindOne = jest.fn();
    repoSoftRemove = jest.fn();
    qbAndWhere = jest.fn().mockReturnThis();
    qbGetMany = jest.fn().mockResolvedValue([]);
    managerQuery = jest.fn().mockResolvedValue([]);

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: qbAndWhere,
      getMany: qbGetMany,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: getRepositoryToken(Student),
          useValue: {
            create: repoCreate,
            save: repoSave,
            findOne: repoFindOne,
            softRemove: repoSoftRemove,
            createQueryBuilder: jest.fn().mockReturnValue(qb),
            manager: { query: managerQuery },
          },
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a student', async () => {
      const dto = { school_id: 'school-1', grade: 'K' };
      const student = { id: 'uuid', ...dto };
      repoCreate.mockReturnValue(student);
      repoSave.mockResolvedValue(student);

      const result = await service.create(dto as any);
      expect(result).toEqual(student);
      expect(repoCreate).toHaveBeenCalledWith(dto);
      expect(repoSave).toHaveBeenCalledWith(student);
    });
  });

  describe('findAll', () => {
    it('returns all non-deleted students when no filters given', async () => {
      const students = [{ id: 'student-1', school_id: 'school-1' }];
      qbGetMany.mockResolvedValueOnce(students);

      const result = await service.findAll({});
      expect(result).toEqual(students);
      expect(managerQuery).not.toHaveBeenCalled();
    });

    it('adds school_id WHERE clause when school_id filter is provided', async () => {
      qbGetMany.mockResolvedValueOnce([]);
      await service.findAll({ school_id: 'school-1' });
      expect(qbAndWhere).toHaveBeenCalledWith('student.school_id = :school_id', {
        school_id: 'school-1',
      });
    });

    it('resolves parent_id via stx_student_guardians join then filters students by id', async () => {
      managerQuery.mockResolvedValueOnce([{ student_id: 'student-1' }]);
      const students = [{ id: 'student-1', school_id: 'school-1' }];
      qbGetMany.mockResolvedValueOnce(students);

      const result = await service.findAll({ parent_id: 'user-1' });
      expect(result).toEqual(students);

      const [sql, params] = managerQuery.mock.calls[0] as [string, string[]];
      expect(sql).toMatch(/FROM stx_student_guardians/);
      expect(sql).toMatch(/JOIN stx_guardians/);
      expect(params[0]).toBe('user-1');

      expect(qbAndWhere).toHaveBeenCalledWith('student.id IN (:...ids)', { ids: ['student-1'] });
    });

    it('returns [] immediately when parent has no guardian links — skips getMany', async () => {
      managerQuery.mockResolvedValueOnce([]);
      const result = await service.findAll({ parent_id: 'user-no-guardian' });
      expect(result).toEqual([]);
      expect(qbGetMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a student if found', async () => {
      const student = { id: 'uuid', school_id: 'school-1' };
      repoFindOne.mockResolvedValue(student);
      expect(await service.findOne('uuid')).toEqual(student);
    });

    it('should throw NotFoundException if student not found', async () => {
      repoFindOne.mockResolvedValue(null);
      await expect(service.findOne('uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
