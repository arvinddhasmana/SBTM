import { Test, TestingModule } from '@nestjs/testing';
import { ParentGatewayService } from './parent.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { School } from '../../auth/entities/school.entity';
import { Route } from '../../auth/entities/route.entity';
import { DataSource } from 'typeorm';

describe('ParentGatewayService', () => {
  let service: ParentGatewayService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'STUDENT_SERVICE_URL') return 'http://student-service:3006';
      if (key === 'ALERTS_SERVICE_URL') return 'http://alerts-service:3003';
      return defaultValue;
    }),
  };

  const mockSchoolRepository = {
    findBy: jest.fn(),
  };

  const mockRouteRepository = {
    findBy: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  const parentUser = {
    id: 'parent-1',
    schoolId: 'school-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentGatewayService,
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(School),
          useValue: mockSchoolRepository,
        },
        {
          provide: getRepositoryToken(Route),
          useValue: mockRouteRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ParentGatewayService>(ParentGatewayService);
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChildrenForParent', () => {
    it('should return children from reference tables when data exists', async () => {
      const refStudents = [
        {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Smith',
          parentId: 'parent-1',
          schoolId: 'school-1',
          assignedRouteId: 'ROUTE-A-AM',
          amRouteId: 'ROUTE-A-AM',
          pmRouteId: 'ROUTE-A-PM',
          amStopId: 'stop-1',
          pmStopId: 'stop-2',
        },
      ];

      // students_reference query
      mockDataSource.query
        .mockResolvedValueOnce(refStudents)
        // route vehicle query
        .mockResolvedValueOnce([
          { id: 'ROUTE-A-AM', vehicleId: 'BUS-01' },
          { id: 'ROUTE-A-PM', vehicleId: 'BUS-01' },
        ])
        // presence events query (for getStudentStatuses)
        .mockResolvedValueOnce([
          { studentId: 'student-1', eventType: 'BOARD', routeId: 'ROUTE-A-AM' },
        ]);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'Greenfield Elementary' },
      ]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice Smith');
      expect(result[0].schoolName).toBe('Greenfield Elementary');
      expect(result[0].amRouteId).toBe('ROUTE-A-AM');
      expect(result[0].pmRouteId).toBe('ROUTE-A-PM');
      expect(result[0].vehicleId).toBe('BUS-01');
      expect(result[0].status).toBe('on_bus');
      expect(result[0].avatarUrl).toBeDefined();
    });

    it('should return empty array when no children found in reference or service', async () => {
      // No reference students
      mockDataSource.query.mockResolvedValueOnce([]);
      // Student service returns empty
      mockHttpClient.get.mockResolvedValue([]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toEqual([]);
    });

    it('should fall back to student service when reference data is empty', async () => {
      // No reference students
      mockDataSource.query.mockResolvedValueOnce([]);

      const studentServiceResponse = [
        {
          id: 'student-1',
          first_name: 'Bob',
          last_name: 'Jones',
          school_id: 'school-1',
          am_route_id: 'ROUTE-B-AM',
          pm_route_id: null,
        },
      ];
      mockHttpClient.get.mockResolvedValue(studentServiceResponse);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'School B' },
      ]);
      mockRouteRepository.findBy.mockResolvedValue([
        { id: 'ROUTE-B-AM', vehicleId: 'BUS-02' },
      ]);

      // getStudentStatuses
      mockDataSource.query.mockResolvedValueOnce([]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bob Jones');
      expect(result[0].schoolName).toBe('School B');
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://student-service:3006/students',
        { params: { parent_id: 'parent-1' } },
      );
    });

    it('should handle reference query failure and fall through to service', async () => {
      // Reference table query fails
      mockDataSource.query.mockRejectedValueOnce(
        new Error('Table does not exist'),
      );
      // Student service returns empty
      mockHttpClient.get.mockResolvedValue([]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toEqual([]);
    });

    it('should set status to at_school for ALIGHT on AM route', async () => {
      const refStudents = [
        {
          id: 'student-1',
          firstName: 'Charlie',
          lastName: 'Brown',
          parentId: 'parent-1',
          schoolId: 'school-1',
          assignedRouteId: 'ROUTE-A-AM',
          amRouteId: 'ROUTE-A-AM',
          pmRouteId: null,
          amStopId: null,
          pmStopId: null,
        },
      ];

      mockDataSource.query
        .mockResolvedValueOnce(refStudents)
        .mockResolvedValueOnce([{ id: 'ROUTE-A-AM', vehicleId: null }])
        .mockResolvedValueOnce([
          {
            studentId: 'student-1',
            eventType: 'ALIGHT',
            routeId: 'ROUTE-A-AM',
          },
        ]);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'School A' },
      ]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result[0].status).toBe('at_school');
    });

    it('should set status to at_home for ALIGHT on PM route', async () => {
      const refStudents = [
        {
          id: 'student-1',
          firstName: 'Dana',
          lastName: 'White',
          parentId: 'parent-1',
          schoolId: 'school-1',
          assignedRouteId: null,
          amRouteId: null,
          pmRouteId: 'ROUTE-A-PM',
          amStopId: null,
          pmStopId: null,
        },
      ];

      mockDataSource.query
        .mockResolvedValueOnce(refStudents)
        .mockResolvedValueOnce([{ id: 'ROUTE-A-PM', vehicleId: null }])
        .mockResolvedValueOnce([
          {
            studentId: 'student-1',
            eventType: 'ALIGHT',
            routeId: 'ROUTE-A-PM',
          },
        ]);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'School A' },
      ]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result[0].status).toBe('at_home');
    });
  });

  describe('getNotificationsForParent', () => {
    it('should return notifications from alerts service', async () => {
      const mockNotifications = [
        { id: 'notif-1', type: 'ROUTE_CHANGE', message: 'Route changed' },
      ];
      mockHttpClient.get.mockResolvedValue(mockNotifications);

      const result = await service.getNotificationsForParent(parentUser);

      expect(result).toEqual(mockNotifications);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/notifications',
        {
          params: { parentUserId: 'parent-1', schoolId: 'school-1' },
        },
      );
    });

    it('should return empty array when alerts service fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getNotificationsForParent(parentUser);

      expect(result).toEqual([]);
    });

    it('should not include schoolId param when user has no schoolId', async () => {
      const userNoSchool = { id: 'parent-1' };
      mockHttpClient.get.mockResolvedValue([]);

      await service.getNotificationsForParent(userNoSchool);

      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/notifications',
        {
          params: { parentUserId: 'parent-1' },
        },
      );
    });
  });

  describe('getAlertStream', () => {
    it('should return an Observable', () => {
      // Mock global fetch to prevent actual network calls
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        body: null,
      });
      global.fetch = mockFetch;

      const result = service.getAlertStream(parentUser);

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });
  });
});
