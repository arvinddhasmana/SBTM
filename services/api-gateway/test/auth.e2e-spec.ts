import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as cookieParser from 'cookie-parser';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { User } from '../src/modules/auth/entities/user.entity';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { Role } from '@sbtm/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;

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
          entities: [User],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService, JwtStrategy],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    authService = moduleFixture.get<AuthService>(AuthService);

    // Create test user
    await authService.createUser(
      'test@example.com',
      'password123',
      Role.PARENT,
      {
        firstName: 'Test',
        lastName: 'User',
      },
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should set httpOnly cookie and return user for valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe('test@example.com');
          const cookies = res.headers['set-cookie'];
          expect(cookies).toBeDefined();
          const accessTokenCookie = (
            Array.isArray(cookies) ? cookies : [cookies]
          ).find((c: string) => c.startsWith('access_token='));
          expect(accessTokenCookie).toBeDefined();
          expect(accessTokenCookie).toContain('HttpOnly');
        });
    });

    it('should normalize email (trim and lowercase) before authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: '  TEST@Example.Com  ', password: 'password123' })
        .expect(200)
        .expect((res) => {
          expect(res.body.user.email).toBe('test@example.com');
        });
    });

    it('should return 401 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@example.com', password: 'password123' })
        .expect(401);
    });

    it('should return 401 for invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 400 for missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    let cookies: string[];

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
      cookies = response.headers['set-cookie'];
    });

    it('should return user profile with valid cookie', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('test@example.com');
          expect(res.body.role).toBe(Role.PARENT);
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
