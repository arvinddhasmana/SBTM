import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { User } from '../src/modules/auth/entities/user.entity';
import { School } from '../src/modules/auth/entities/school.entity';
import { SchoolBoard } from '../src/modules/auth/entities/school-board.entity';
import { Vehicle } from '../src/modules/auth/entities/vehicle.entity';
import { Route } from '../src/modules/auth/entities/route.entity';
import { RouteStop } from '../src/modules/auth/entities/route-stop.entity';
import { FleetController } from '../src/modules/fleet/fleet.controller';
import { FleetService } from '../src/modules/fleet/fleet.service';
import { RouteController } from '../src/modules/route/route.controller';
import { RouteService } from '../src/modules/route/route.service';
import { OptimizationService } from '../src/modules/route/optimization.service';
import { SchoolController } from '../src/modules/organization/school.controller';
import { SchoolService } from '../src/modules/organization/school.service';
import { SchoolBoardController } from '../src/modules/organization/school-board.controller';
import { SchoolBoardService } from '../src/modules/organization/school-board.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { Role, RolesGuard } from '@sbtm/common';
import { MultiTenancyGuard } from '../src/common/guards/multi-tenancy.guard';
import { DataSource } from 'typeorm';

describe('Module 2: Route & Vehicle Management (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let schoolService: SchoolService;
  let boardService: SchoolBoardService;

  let schoolA1Token: string;
  let schoolA2Token: string;
  let schoolA1Id: string;
  let schoolA2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5433', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'mysecretpassword',
          database: process.env.DB_DATABASE || 'sbms_test',
          entities: [User, School, SchoolBoard, Vehicle, Route, RouteStop],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([
          User,
          School,
          SchoolBoard,
          Vehicle,
          Route,
          RouteStop,
        ]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'your-secret-key',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [
        AuthController,
        SchoolController,
        SchoolBoardController,
        FleetController,
        RouteController,
      ],
      providers: [
        AuthService,
        SchoolService,
        SchoolBoardService,
        FleetService,
        RouteService,
        OptimizationService,
        JwtStrategy,
        RolesGuard,
        MultiTenancyGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    authService = moduleFixture.get<AuthService>(AuthService);
    schoolService = moduleFixture.get<SchoolService>(SchoolService);
    boardService = moduleFixture.get<SchoolBoardService>(SchoolBoardService);

    // Setup Data
    const board = await boardService.create('Board A');
    const school1 = await schoolService.create('School A1', board.id);
    const school2 = await schoolService.create('School A2', board.id);
    schoolA1Id = school1.id;
    schoolA2Id = school2.id;

    await authService.createUser(
      'schoolA1@test.com',
      'password',
      Role.SCHOOL_ADMIN,
      { boardId: board.id, schoolId: schoolA1Id },
    );
    await authService.createUser(
      'schoolA2@test.com',
      'password',
      Role.SCHOOL_ADMIN,
      { boardId: board.id, schoolId: schoolA2Id },
    );

    const login1 = await authService.login({
      email: 'schoolA1@test.com',
      password: 'password',
    });
    schoolA1Token = login1.accessToken;

    const login2 = await authService.login({
      email: 'schoolA2@test.com',
      password: 'password',
    });
    schoolA2Token = login2.accessToken;
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('TC-2.1: Vehicle Creation & Isolation', () => {
    it('should allow School Admin to create a vehicle', async () => {
      const res = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${schoolA1Token}`)
        .send({
          licensePlate: 'BUS-101',
          schoolId: schoolA1Id,
        })
        .expect(201);

      expect(res.body.licensePlate).toBe('BUS-101');
    });

    it('should prevent duplicate license plate in same school', async () => {
      await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${schoolA1Token}`)
        .send({
          licensePlate: 'BUS-101',
          schoolId: schoolA1Id,
        })
        .expect(409);
    });

    it('should allow same license plate in different school', async () => {
      await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${schoolA2Token}`)
        .send({
          licensePlate: 'BUS-101',
          schoolId: schoolA2Id,
        })
        .expect(201);
    });
  });

  describe('TC-2.2 & 2.3: Route Assignment & Conflict', () => {
    let vehicleId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/vehicles')
        .set('Authorization', `Bearer ${schoolA1Token}`);
      vehicleId = res.body[0].id;
    });

    it('should create a route and assign a vehicle', async () => {
      const res = await request(app.getHttpServer())
        .post('/routes')
        .set('Authorization', `Bearer ${schoolA1Token}`)
        .send({
          name: 'Route AM-1',
          direction: 'AM',
          schoolId: schoolA1Id,
          vehicleId: vehicleId,
          startTime: '07:00',
          estimatedDuration: 60,
        })
        .expect(201);

      expect(res.body.vehicleId).toBe(vehicleId);
    });

    it('should forbid assigning the same vehicle to overlapping route', async () => {
      await request(app.getHttpServer())
        .post('/routes')
        .set('Authorization', `Bearer ${schoolA1Token}`)
        .send({
          name: 'Route AM-2 (Conflict)',
          direction: 'AM',
          schoolId: schoolA1Id,
          vehicleId: vehicleId,
          startTime: '07:30', // Overlaps with 07:00-08:00
          estimatedDuration: 60,
        })
        .expect(409);
    });

    it('should allow assigning the same vehicle to non-overlapping route', async () => {
      await request(app.getHttpServer())
        .post('/routes')
        .set('Authorization', `Bearer ${schoolA1Token}`)
        .send({
          name: 'Route PM-1',
          direction: 'PM',
          schoolId: schoolA1Id,
          vehicleId: vehicleId,
          startTime: '14:30',
          estimatedDuration: 60,
        })
        .expect(201);
    });
  });

  describe('TC-2.4: Optimize Calculation', () => {
    it('should return optimized stops and polyline', async () => {
      const stops = [
        { sequence: 0, address: 'Stop B', location: 'POINT(-75.1 45.1)' },
        { sequence: 0, address: 'Stop A', location: 'POINT(-75.0 45.0)' },
      ];

      const res = await request(app.getHttpServer())
        .post('/routes/optimize')
        .set('Authorization', `Bearer ${schoolA1Token}`)
        .send(stops)
        .expect(201);

      expect(res.body.optimizedStops[0].address).toBe('Stop A');
      expect(res.body.polyline).toBeDefined();
    });
  });
});
