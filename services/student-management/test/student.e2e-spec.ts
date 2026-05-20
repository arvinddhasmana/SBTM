import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request_ from 'supertest';
const supertest = request_ as any;
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StudentModule } from '../src/modules/student/student.module';
import { Student } from '../src/modules/student/entities/student.entity';

describe('Student Management Service (e2e)', () => {
  let app: INestApplication;

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
          database: 'sbms',
          entities: [Student],
          synchronize: false,
        }),
        StudentModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let studentId: string;

  it('/students (POST) - should enroll a new student with v2 fields', () => {
    return supertest(app.getHttpServer())
      .post('/students')
      .send({
        school_id: '123e4567-e89b-12d3-a456-426614174000',
        grade: '1',
      })
      .expect((res) => {
        if (res.status !== 201) {
          throw new Error(`ENROLLMENT FAILED: ${JSON.stringify(res.body)}`);
        }
        expect(res.body.id).toBeDefined();
        expect(res.body.school_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        studentId = res.body.id;
      });
  });

  it('/students (GET) - should list all students', () => {
    return supertest(app.getHttpServer())
      .get('/students')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('/students/:id (GET) - should get student by id with v2 fields', () => {
    return supertest(app.getHttpServer())
      .get(`/students/${studentId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(studentId);
        expect(res.body.school_id).toBeDefined();
        // v2 entity: no first_name, last_name, am_route_id, pm_route_id
        expect(res.body.first_name).toBeUndefined();
        expect(res.body.last_name).toBeUndefined();
      });
  });

  it('/students/bulk-import (POST) - should bulk import students from CSV (Multipart)', () => {
    const csvContent = `grade\n2\n3`;
    const buffer = Buffer.from(csvContent);

    return supertest(app.getHttpServer())
      .post('/students/bulk-import')
      .attach('file', buffer, 'students.csv')
      .field('school_id', '123e4567-e89b-12d3-a456-426614174000')
      .expect(201)
      .expect((res) => {
        expect(typeof res.body.success).toBe('number');
        expect(typeof res.body.failed).toBe('number');
      });
  });
});
