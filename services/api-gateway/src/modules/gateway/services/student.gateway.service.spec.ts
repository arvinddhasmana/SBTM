import { Test, TestingModule } from '@nestjs/testing';
import { StudentGatewayService } from './student.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '@sbtm/common';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';

describe('StudentGatewayService', () => {
  let service: StudentGatewayService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'STUDENT_SERVICE_URL') return 'http://student-service:3006';
      return defaultValue;
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'STUDENT_SERVICE_URL') return 'http://student-service:3006';
      throw new Error(`Config key ${key} not found`);
    }),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  const adminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: Role.STA_ADMIN,
    anchorKind: 'sta',
    anchorId: 'sta-1',
    preferredLanguage: 'en',
  };

  const superAdminUser: AuthenticatedUser = {
    id: 'super-admin-1',
    email: 'super@example.com',
    role: Role.SUPER_ADMIN,
    anchorKind: 'super',
    anchorId: 'super-admin-1',
    preferredLanguage: 'en',
  };

  const parentUser: AuthenticatedUser = {
    id: 'parent-1',
    email: 'parent@example.com',
    role: Role.PARENT,
    anchorKind: 'parent',
    anchorId: 'parent-1',
    preferredLanguage: 'en',
  };

  const schoolAdminUser: AuthenticatedUser = {
    id: 'school-admin-1',
    email: 'sa@example.com',
    role: Role.SCHOOL_ADMIN,
    anchorKind: 'school',
    anchorId: 'school-1',
    preferredLanguage: 'en',
  };

  const driverUser: AuthenticatedUser = {
    id: 'driver-1',
    email: 'driver@example.com',
    role: Role.DRIVER,
    anchorKind: 'driver',
    anchorId: 'driver-1',
    preferredLanguage: 'en',
  };

  const driverUserWithSchool: AuthenticatedUser = {
    id: 'driver-2',
    email: 'driver2@example.com',
    role: Role.DRIVER,
    anchorKind: 'school',
    anchorId: 'school-1',
    preferredLanguage: 'en',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentGatewayService,
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<StudentGatewayService>(StudentGatewayService);
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStudents', () => {
    it('should force parent_id for PARENT role', async () => {
      mockHttpClient.get.mockResolvedValue([
        {
          id: 's1',
          first_name: 'Alice',
          last_name: 'Smith',
          am_route_id: 'ROUTE-A',
          pm_route_id: null,
        },
      ]);

      const query: any = {};
      await service.getStudents(query, parentUser);

      expect(query.parent_id).toBe('parent-1');
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://student-service:3006/students',
        { params: expect.objectContaining({ parent_id: 'parent-1' }) },
      );
    });

    it('should not restrict query for ADMIN role', async () => {
      mockHttpClient.get.mockResolvedValue([]);
      // Fall through to demo fallback
      mockDataSource.query.mockResolvedValue([]);

      const query: any = {};
      await service.getStudents(query, adminUser);

      expect(query.parent_id).toBeUndefined();
    });

    it('should throw ForbiddenException for DRIVER without schoolId', async () => {
      await expect(service.getStudents({}, driverUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should scope by schoolId for DRIVER role', async () => {
      mockHttpClient.get.mockResolvedValue([]);
      mockDataSource.query.mockResolvedValue([]);

      const query: any = {};
      await service.getStudents(query, driverUserWithSchool);

      expect(query.school_id).toBe('school-1');
    });

    it('should fall back to demo reference data when service returns empty', async () => {
      mockHttpClient.get.mockResolvedValue([]);
      mockDataSource.query.mockResolvedValue([
        {
          id: 's1',
          firstName: 'Alice',
          lastName: 'Smith',
          grade: 5,
          assignedRouteId: 'ROUTE-A',
          amRouteId: 'ROUTE-A',
          pmRouteId: null,
        },
      ]);

      const result = await service.getStudents({}, adminUser);

      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe('Alice');
      expect(result[0].status).toBe('ENROLLED');
      expect(result[0].am_route_id).toBe('ROUTE-A');
    });

    it('should return route data from student service response', async () => {
      // Student service returns students with UUID route IDs
      mockHttpClient.get.mockResolvedValue([
        {
          id: 's1',
          first_name: 'Bob',
          last_name: 'Jones',
          am_route_id: 'a0000000-0000-0000-0000-000000000b01',
          pm_route_id: 'a0000000-0000-0000-0000-000000000b02',
        },
      ]);

      const result = await service.getStudents({}, adminUser);

      expect(result[0].am_route_id).toBe(
        'a0000000-0000-0000-0000-000000000b01',
      );
      expect(result[0].pm_route_id).toBe(
        'a0000000-0000-0000-0000-000000000b02',
      );
    });
  });

  describe('getStudentById', () => {
    it('should return student from service for admin', async () => {
      const mockStudent = {
        id: 's1',
        first_name: 'Alice',
        last_name: 'Smith',
        school_id: 'school-1',
      };
      mockHttpClient.get.mockResolvedValue(mockStudent);

      const result = await service.getStudentById('s1', superAdminUser);

      expect(result).toEqual(mockStudent);
    });

    it('should throw ForbiddenException when parent accesses other parents child', async () => {
      const mockStudent = {
        id: 's1',
        parent_user_id: 'other-parent',
        school_id: 'school-1',
      };
      mockHttpClient.get.mockResolvedValue(mockStudent);

      await expect(service.getStudentById('s1', parentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should fall back to demo data when service fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Service unavailable'));
      mockDataSource.query.mockResolvedValue([
        {
          id: 's1',
          firstName: 'Alice',
          lastName: 'Smith',
          grade: 3,
          amRouteId: 'a0000000-0000-0000-0000-000000000a01',
          pmRouteId: null,
          schoolId: 'school-1',
          parentId: 'parent-1',
        },
      ]);

      const result = await service.getStudentById('s1', parentUser);

      expect(result.first_name).toBe('Alice');
      expect(result.am_route_id).toBe('a0000000-0000-0000-0000-000000000a01');
    });
  });

  describe('enrollStudent', () => {
    it('should enroll student for ADMIN', async () => {
      const dto = {
        first_name: 'New',
        last_name: 'Student',
        school_id: 'school-1',
      };
      const mockResponse = { id: 's-new', ...dto };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.enrollStudent(dto, adminUser);

      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://student-service:3006/students',
        dto,
      );
    });

    it('should force schoolId for SCHOOL_ADMIN', async () => {
      const dto: any = { first_name: 'New', last_name: 'Student' };
      mockHttpClient.post.mockResolvedValue({ id: 's-new' });

      await service.enrollStudent(dto, schoolAdminUser);

      expect(dto.school_id).toBe('school-1');
    });

    it('should throw ForbiddenException for unauthorized role', async () => {
      await expect(service.enrollStudent({}, parentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('bulkImport', () => {
    it('should throw ForbiddenException for non-admin roles', async () => {
      await expect(
        service.bulkImport({}, 'school-1', parentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use user schoolId for SCHOOL_ADMIN', async () => {
      mockHttpClient.post.mockResolvedValue({ imported: 5 });

      await service.bulkImport(
        { data: 'csv' },
        'school-other',
        schoolAdminUser,
      );

      expect(httpClient.post).toHaveBeenCalledWith(
        'http://student-service:3006/students/bulk-import',
        { file: { data: 'csv' }, school_id: 'school-1' },
      );
    });
  });
});
