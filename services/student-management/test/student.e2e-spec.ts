import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
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
                    host: 'localhost',
                    port: 5433,
                    username: 'postgres',
                    password: 'mysecretpassword',
                    database: 'sbms',
                    entities: [Student],
                    synchronize: true,
                }),
                StudentModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    let studentId: string;

    it('/students (POST) - should enroll a new student', () => {
        const timestamp = Date.now();
        return supertest(app.getHttpServer())
            .post('/students')
            .send({
                first_name: `Jane-${timestamp}`,
                last_name: 'Smith',
                grade: '1',
                school_id: '123e4567-e89b-12d3-a456-426614174000',
                external_student_id: `EXT-${timestamp}`
            })
            .expect((res) => {
                if (res.status !== 201) {
                    throw new Error(`VALIDATION FAILED: ${JSON.stringify(res.body)}`);
                }
                expect(res.body.id).toBeDefined();
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

    it('/students/:id (GET) - should get student by id', () => {
        return supertest(app.getHttpServer())
            .get(`/students/${studentId}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(studentId);
            });
    });

    it('/students/:id/assignment (PATCH) - should assign routes', () => {
        return supertest(app.getHttpServer())
            .patch(`/students/${studentId}/assignment`)
            .send({
                am_route_id: '223e4567-e89b-12d3-a456-426614174002',
                pm_route_id: '323e4567-e89b-12d3-a456-426614174003'
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.am_route_id).toBe('223e4567-e89b-12d3-a456-426614174002');
                expect(res.body.pm_route_id).toBe('323e4567-e89b-12d3-a456-426614174003');
            });
    });

    it('/students/bulk-import (POST) - should bulk import students from CSV (Multipart)', () => {
        const timestamp = Date.now();
        const csvContent = `first_name,last_name,grade,address,external_student_id\nBob,Marley,2,One Love Way,BULK-1-${timestamp}\nAlice,Wonderland,3,Magic St,BULK-2-${timestamp}`;
        const buffer = Buffer.from(csvContent);

        return supertest(app.getHttpServer())
            .post('/students/bulk-import')
            .attach('file', buffer, 'students.csv')
            .field('school_id', '123e4567-e89b-12d3-a456-426614174000')
            .expect(201)
            .expect((res) => {
                expect(res.body.success).toBe(2);
                expect(res.body.failed).toBe(0);
            });
    });

    it('/students/bulk-import (POST) - should bulk import students from body (JSON)', () => {
        const timestamp = Date.now() + 10;
        const csvContent = `first_name,last_name,grade,address,external_student_id\nCharlie,Brown,4,Doghouse St,JSON-${timestamp}`;

        return supertest(app.getHttpServer())
            .post('/students/bulk-import')
            .send({
                file: csvContent,
                school_id: '123e4567-e89b-12d3-a456-426614174000'
            })
            .expect(201)
            .expect((res) => {
                expect(res.body.success).toBe(1);
                expect(res.body.failed).toBe(0);
            });
    });
});
