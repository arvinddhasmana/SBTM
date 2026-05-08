import { Test, TestingModule } from '@nestjs/testing';
import { DriverGatewayService } from './driver.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Route } from '../../auth/entities/route.entity';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '@sbtm/common';

describe('DriverGatewayService', () => {
  let service: DriverGatewayService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'PRESENCE_SERVICE_URL') return 'http://presence-service:3004';
      return defaultValue;
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'PRESENCE_SERVICE_URL') return 'http://presence-service:3004';
      throw new Error(`Config key ${key} not found`);
    }),
  };

  const mockRouteRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  const driverUser = {
    id: 'driver-1',
    role: Role.DRIVER,
    assignedRouteIds: ['ROUTE-A-AM', 'ROUTE-A-PM'],
    schoolId: 'school-1',
  };

  const driverUserNoRoutes = {
    id: 'driver-2',
    role: Role.DRIVER,
    assignedRouteIds: [],
    schoolId: 'school-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverGatewayService,
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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

    service = module.get<DriverGatewayService>(DriverGatewayService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScheduleForDriver', () => {
    it('should return empty array when driver has no assigned routes', async () => {
      const result = await service.getScheduleForDriver(driverUserNoRoutes);

      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should return route schedule for assigned routes', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          id: 'ROUTE-A-AM',
          name: 'Route A AM',
          direction: 'AM',
          schedule: '{"startTime":"07:30"}',
          vehicleId: 'BUS-01',
          schoolId: 'school-1',
          polyline: null,
          schoolLat: '45.42',
          schoolLng: '-75.69',
          schoolName: 'Greenfield Elementary',
        },
        {
          id: 'ROUTE-A-PM',
          name: 'Route A PM',
          direction: 'PM',
          schedule: '{"startTime":"15:00"}',
          vehicleId: 'BUS-01',
          schoolId: 'school-1',
          polyline: 'encoded-polyline',
          schoolLat: '45.42',
          schoolLng: '-75.69',
          schoolName: 'Greenfield Elementary',
        },
      ]);

      const result = await service.getScheduleForDriver(driverUser);

      expect(result).toHaveLength(2);
      expect(result[0].routeId).toBe('ROUTE-A-AM');
      expect(result[0].direction).toBe('AM');
      expect(result[0].startTime).toBe('07:30');
      expect(result[0].vehicleId).toBe('BUS-01');
      expect(result[0].schoolLat).toBe(45.42);
      expect(result[0].schoolLng).toBe(-75.69);
      expect(result[0].schoolName).toBe('Greenfield Elementary');
      expect(result[1].routeId).toBe('ROUTE-A-PM');
      expect(result[1].polyline).toBe('encoded-polyline');
    });

    it('should parse schedule object correctly', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          id: 'ROUTE-A-AM',
          name: 'Route A AM',
          direction: 'AM',
          startTime: '08:00',
          vehicleId: null,
          schoolId: 'school-1',
          polyline: null,
          schoolLat: null,
          schoolLng: null,
          schoolName: null,
        },
      ]);

      const result = await service.getScheduleForDriver(driverUser);

      expect(result[0].startTime).toBe('08:00');
      expect(result[0].vehicleId).toBeUndefined();
      expect(result[0].schoolLat).toBeUndefined();
      expect(result[0].schoolName).toBeUndefined();
    });

    it('should infer direction from route ID when direction is missing', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          id: 'ROUTE-A-PM',
          name: 'Route A PM',
          direction: null,
          schedule: '{}',
          vehicleId: null,
          schoolId: 'school-1',
          polyline: null,
          schoolLat: null,
          schoolLng: null,
          schoolName: null,
        },
      ]);

      const result = await service.getScheduleForDriver(driverUser);

      expect(result[0].direction).toBe('PM');
    });
  });

  describe('getRouteStudents', () => {
    it('should throw ForbiddenException if driver not assigned to route', async () => {
      await expect(
        service.getRouteStudents('ROUTE-B-AM', driverUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if no schoolId in user context', async () => {
      const userNoSchool = {
        ...driverUser,
        schoolId: undefined,
      };

      await expect(
        service.getRouteStudents('ROUTE-A-AM', userNoSchool),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return stops and empty students when no enrolled students', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ direction: 'AM' }]) // route direction
        .mockResolvedValueOnce([]) // enrolled students
        .mockResolvedValueOnce([
          // stops
          {
            id: 'stop-1',
            sequence: 1,
            address: 'Main St',
            lat: 45.42,
            lng: -75.69,
            arrivalTime: '07:35',
          },
        ]);

      const result = await service.getRouteStudents('ROUTE-A-AM', driverUser);

      expect(result.students).toEqual([]);
      expect(result.stops).toHaveLength(1);
      expect(result.stops[0].stopName).toBe('Main St');
      expect(result.direction).toBe('AM');
    });

    it('should return students with presence status merged', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ direction: 'AM' }]) // route direction
        .mockResolvedValueOnce([
          // enrolled students
          {
            id: 'student-1',
            first_name: 'Alice',
            last_name: 'Smith',
            am_stop_id: 'stop-1',
            pm_stop_id: 'stop-2',
          },
        ])
        .mockResolvedValueOnce([
          // stops
          {
            id: 'stop-1',
            sequence: 1,
            address: 'Main St',
            lat: 45.42,
            lng: -75.69,
            arrivalTime: '07:35',
          },
        ]);

      // Presence service returns BOARDED for this student
      mockHttpClient.get.mockResolvedValue([
        {
          studentId: 'student-1',
          status: 'BOARDED',
          lastSeen: '2025-01-01T08:00:00Z',
        },
      ]);

      const result = await service.getRouteStudents('ROUTE-A-AM', driverUser);

      expect(result.students).toHaveLength(1);
      expect(result.students[0].name).toBe('Alice Smith');
      expect(result.students[0].status).toBe('BOARDED');
      expect(result.students[0].stopId).toBe('stop-1'); // AM direction uses amStopId
      expect(result.students[0].stopName).toBe('Main St');
      expect(result.students[0].avatarUrl).toBeDefined();
    });

    it('should default to NOT_BOARDED when presence service is unavailable', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ direction: 'AM' }]) // route direction
        .mockResolvedValueOnce([
          {
            id: 'student-1',
            first_name: 'Bob',
            last_name: 'Jones',
            am_stop_id: 'stop-1',
            pm_stop_id: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'stop-1',
            sequence: 1,
            address: 'Elm St',
            lat: null,
            lng: null,
            arrivalTime: '07:40',
          },
        ]);

      mockHttpClient.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getRouteStudents('ROUTE-A-AM', driverUser);

      expect(result.students[0].status).toBe('NOT_BOARDED');
    });

    it('should use pmStopId for PM direction routes', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ direction: 'PM' }]) // route direction
        .mockResolvedValueOnce([
          {
            id: 'student-1',
            first_name: 'Alice',
            last_name: 'Smith',
            am_stop_id: 'stop-1',
            pm_stop_id: 'stop-2',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'stop-2',
            sequence: 1,
            address: 'Oak Ave',
            lat: 45.5,
            lng: -75.7,
            arrivalTime: '15:10',
          },
        ]);

      mockHttpClient.get.mockResolvedValue([]);

      const result = await service.getRouteStudents('ROUTE-A-PM', driverUser);

      expect(result.direction).toBe('PM');
      expect(result.students[0].stopId).toBe('stop-2');
    });
  });
});
