import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParentGatewayService } from './parent.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { School } from '../../auth/entities/school.entity';
import { Route } from '../../auth/entities/route.entity';

describe('ParentGatewayService - Status Logic', () => {
  let service: ParentGatewayService;
  let mockHttpClient: jest.Mocked<HttpClientService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockSchoolRepository: jest.Mocked<Repository<School>>;
  let mockRouteRepository: jest.Mocked<Repository<Route>>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockHttpClient = {
      get: jest.fn(),
    } as any;

    mockDataSource = {
      query: jest.fn(),
    } as any;

    mockSchoolRepository = {
      findBy: jest.fn(),
    } as any;

    mockRouteRepository = {
      findBy: jest.fn(),
    } as any;

    mockConfigService = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'STUDENT_SERVICE_URL') return 'http://student-service:3006';
        if (key === 'ALERTS_SERVICE_URL') return 'http://alerts-service:3003';
        return 'mock-value';
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentGatewayService,
        { provide: HttpClientService, useValue: mockHttpClient },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(School), useValue: mockSchoolRepository },
        { provide: getRepositoryToken(Route), useValue: mockRouteRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ParentGatewayService>(ParentGatewayService);
  });

  describe('getChildrenForParent - Status Determination', () => {
    const parentUser = { id: 'parent-1', schoolId: 'school-1' };

    it('should return "on_bus" status when latest event is BOARD', async () => {
      const studentServiceResponse = [
        {
          id: 'student-1',
          first_name: 'Alice',
          last_name: 'Smith',
          school_id: 'school-1',
          am_route_id: 'route-uuid-am',
          pm_route_id: 'route-uuid-pm',
        },
      ];
      mockHttpClient.get.mockResolvedValue(studentServiceResponse);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'Test School' } as School,
      ]);

      mockRouteRepository.findBy.mockResolvedValue([
        {
          id: 'route-uuid-am',
          name: 'Route AM',
          direction: 'AM',
          vehicleId: 'BUS-01',
        } as Route,
        {
          id: 'route-uuid-pm',
          name: 'Route PM',
          direction: 'PM',
          vehicleId: 'BUS-01',
        } as Route,
      ]);

      // Mock presence events query - latest event is BOARD
      mockDataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventType: 'BOARD',
          routeId: 'route-uuid-am',
          direction: 'AM',
        },
      ]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('on_bus');
    });

    it('should return "at_school" status when latest event is ALIGHT on AM route', async () => {
      const studentServiceResponse = [
        {
          id: 'student-1',
          first_name: 'Bob',
          last_name: 'Jones',
          school_id: 'school-1',
          am_route_id: 'route-uuid-am',
          pm_route_id: null,
        },
      ];
      mockHttpClient.get.mockResolvedValue(studentServiceResponse);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'Test School' } as School,
      ]);

      mockRouteRepository.findBy.mockResolvedValue([
        {
          id: 'route-uuid-am',
          name: 'Route AM',
          direction: 'AM',
          vehicleId: 'BUS-02',
        } as Route,
      ]);

      // Mock presence events query - latest event is ALIGHT on AM route
      mockDataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventType: 'ALIGHT',
          routeId: 'route-uuid-am',
          direction: 'AM',
        },
      ]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('at_school');
    });

    it('should return "at_home" status when latest event is ALIGHT on PM route', async () => {
      const studentServiceResponse = [
        {
          id: 'student-1',
          first_name: 'Carol',
          last_name: 'White',
          school_id: 'school-1',
          am_route_id: null,
          pm_route_id: 'route-uuid-pm',
        },
      ];
      mockHttpClient.get.mockResolvedValue(studentServiceResponse);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'Test School' } as School,
      ]);

      mockRouteRepository.findBy.mockResolvedValue([
        {
          id: 'route-uuid-pm',
          name: 'Route PM',
          direction: 'PM',
          vehicleId: 'BUS-03',
        } as Route,
      ]);

      // Mock presence events query - latest event is ALIGHT on PM route
      mockDataSource.query.mockResolvedValueOnce([
        {
          studentId: 'student-1',
          eventType: 'ALIGHT',
          routeId: 'route-uuid-pm',
          direction: 'PM',
        },
      ]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('at_home');
    });

    it('should return time-based default when no presence events exist', async () => {
      const studentServiceResponse = [
        {
          id: 'student-1',
          first_name: 'David',
          last_name: 'Brown',
          school_id: 'school-1',
          am_route_id: 'route-uuid-am',
          pm_route_id: null,
        },
      ];
      mockHttpClient.get.mockResolvedValue(studentServiceResponse);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'Test School' } as School,
      ]);

      mockRouteRepository.findBy.mockResolvedValue([
        {
          id: 'route-uuid-am',
          name: 'Route AM',
          direction: 'AM',
          vehicleId: 'BUS-04',
        } as Route,
      ]);

      // Mock presence events query - no events
      mockDataSource.query.mockResolvedValueOnce([]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      // Status should be time-based: 'at_school' during school hours, 'at_home' after
      expect(['at_school', 'at_home']).toContain(result[0].status);
    });

    it('should handle database query errors gracefully with time-based fallback', async () => {
      const studentServiceResponse = [
        {
          id: 'student-1',
          first_name: 'Eve',
          last_name: 'Green',
          school_id: 'school-1',
          am_route_id: 'route-uuid-am',
          pm_route_id: null,
        },
      ];
      mockHttpClient.get.mockResolvedValue(studentServiceResponse);

      mockSchoolRepository.findBy.mockResolvedValue([
        { id: 'school-1', name: 'Test School' } as School,
      ]);

      mockRouteRepository.findBy.mockResolvedValue([
        {
          id: 'route-uuid-am',
          name: 'Route AM',
          direction: 'AM',
          vehicleId: 'BUS-05',
        } as Route,
      ]);

      // Mock presence events query - database error
      mockDataSource.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toHaveLength(1);
      // Status should fallback to time-based default
      expect(['at_school', 'at_home']).toContain(result[0].status);
    });

    it('should return empty array when student service returns no children', async () => {
      mockHttpClient.get.mockResolvedValue([]);

      const result = await service.getChildrenForParent(parentUser);

      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });
});
