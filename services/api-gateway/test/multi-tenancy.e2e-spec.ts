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
import { SchoolController } from '../src/modules/organization/school.controller';
import { SchoolService } from '../src/modules/organization/school.service';
import { SchoolBoardController } from '../src/modules/organization/school-board.controller';
import { SchoolBoardService } from '../src/modules/organization/school-board.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { Role } from '../src/common/decorators/roles.decorator';
import { MultiTenancyGuard } from '../src/common/guards/multi-tenancy.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { DataSource } from 'typeorm';

describe('Multi-Tenancy (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let authService: AuthService;
    let schoolService: SchoolService;
    let boardService: SchoolBoardService;

    let ostaToken: string;
    let boardAToken: string;
    let schoolA1Token: string;

    let boardAId: string;
    let schoolA1Id: string;
    let schoolA2Id: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true }),
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'localhost',
                    port: 5433,
                    username: 'postgres',
                    password: 'mysecretpassword',
                    database: 'sbms_test',
                    entities: [User, School, SchoolBoard],
                    synchronize: true,
                    dropSchema: true,
                }),
                TypeOrmModule.forFeature([User, School, SchoolBoard]),
                PassportModule.register({ defaultStrategy: 'jwt' }),
                JwtModule.register({
                    secret: 'test-secret',
                    signOptions: { expiresIn: '1h' },
                }),
            ],
            controllers: [AuthController, SchoolController, SchoolBoardController],
            providers: [AuthService, SchoolService, SchoolBoardService, JwtStrategy, RolesGuard, MultiTenancyGuard],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        dataSource = moduleFixture.get<DataSource>(DataSource);
        authService = moduleFixture.get<AuthService>(AuthService);
        schoolService = moduleFixture.get<SchoolService>(SchoolService);
        boardService = moduleFixture.get<SchoolBoardService>(SchoolBoardService);

        // 1. Setup Data
        const boardA = await boardService.create('Board A');
        boardAId = boardA.id;

        const schoolA1 = await schoolService.create('School A1', boardAId);
        schoolA1Id = schoolA1.id;

        const schoolA2 = await schoolService.create('School A2', boardAId);
        schoolA2Id = schoolA2.id;

        // 2. Setup Users
        await authService.createUser('osta@test.com', 'password', Role.OSTA_ADMIN);
        await authService.createUser('boardA@test.com', 'password', Role.BOARD_ADMIN, { boardId: boardAId });
        await authService.createUser('schoolA1@test.com', 'password', Role.SCHOOL_ADMIN, { boardId: boardAId, schoolId: schoolA1Id });

        // 3. Get Tokens
        const ostaLogin = await authService.login({ email: 'osta@test.com', password: 'password' });
        ostaToken = ostaLogin.accessToken;

        const boardALogin = await authService.login({ email: 'boardA@test.com', password: 'password' });
        boardAToken = boardALogin.accessToken;

        const schoolA1Login = await authService.login({ email: 'schoolA1@test.com', password: 'password' });
        schoolA1Token = schoolA1Login.accessToken;
    });

    afterAll(async () => {
        await dataSource.destroy();
        await app.close();
    });

    describe('TC-1.1: OSTA Admin Scope', () => {
        it('should allow OSTA Admin to see all boards', () => {
            return request(app.getHttpServer())
                .get('/boards')
                .set('Authorization', `Bearer ${ostaToken}`)
                .expect(200)
                .expect((res: any) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });
    });

    describe('TC-1.2: School Admin Isolation (Positive)', () => {
        it('should allow School Admin to see their school', () => {
            return request(app.getHttpServer())
                .get(`/schools/${schoolA1Id}`)
                .set('Authorization', `Bearer ${schoolA1Token}`)
                .expect(200)
                .expect((res: any) => {
                    expect(res.body.id).toBe(schoolA1Id);
                });
        });
    });

    describe('TC-1.3: School Admin Isolation (Negative)', () => {
        it('should forbid School Admin from seeing another school', () => {
            return request(app.getHttpServer())
                .get(`/schools/${schoolA2Id}`)
                .set('Authorization', `Bearer ${schoolA1Token}`)
                .expect(403);
        });
    });

    describe('TC-1.4: Hierarchy Enforcement', () => {
        it('should forbid School Admin from creating a school board', () => {
            return request(app.getHttpServer())
                .post('/boards')
                .set('Authorization', `Bearer ${schoolA1Token}`)
                .send({ name: 'Illegal Board' })
                .expect(403);
        });

        it('should allow OSTA Admin to create a school board', () => {
            return request(app.getHttpServer())
                .post('/boards')
                .set('Authorization', `Bearer ${ostaToken}`)
                .send({ name: 'New OSTA Board' })
                .expect(201);
        });
    });
});
