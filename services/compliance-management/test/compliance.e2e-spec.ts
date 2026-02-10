import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
const supertest = request as any;
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InspectionModule } from '../src/modules/inspection/inspection.module';
import { ComplianceModule } from '../src/modules/compliance/compliance.module';
import { AuditModule } from '../src/modules/audit/audit.module';
import { VehicleInspection } from '../src/modules/inspection/entities/vehicle-inspection.entity';
import { DriverCompliance } from '../src/modules/compliance/entities/driver-compliance.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';

describe('Compliance Management Service (e2e)', () => {
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
                    entities: [VehicleInspection, DriverCompliance, AuditLog],
                    synchronize: true,
                }),
                InspectionModule,
                ComplianceModule,
                AuditModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
        }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    const schoolId = '123e4567-e89b-12d3-a456-426614174000';
    const vehicleId = '223e4567-e89b-12d3-a456-426614174001';
    const driverId = '323e4567-e89b-12d3-a456-426614174002';

    it('/inspections (POST)', () => {
        return supertest(app.getHttpServer())
            .post('/inspections')
            .send({
                vehicle_id: vehicleId,
                driver_id: driverId,
                school_id: schoolId,
                type: 'PRE_TRIP',
                is_passed: true,
                checklist_json: { brakes: 'OK', lights: 'OK' }
            })
            .expect(201)
            .expect((res) => {
                expect(res.body.id).toBeDefined();
                expect(res.body.is_passed).toBe(true);
            });
    });

    it('/compliance/driver/:driverId (POST)', () => {
        return supertest(app.getHttpServer())
            .post(`/compliance/driver/${driverId}`)
            .send({
                school_id: schoolId,
                license_expiry: '2027-12-31',
                status: 'VALID'
            })
            .expect(201)
            .expect((res) => {
                expect(res.body.status).toBe('VALID');
                expect(res.body.driver_id).toBe(driverId);
            });
    });

    it('/audit (POST)', () => {
        return supertest(app.getHttpServer())
            .post('/audit')
            .send({
                user_id: driverId,
                school_id: schoolId,
                action: 'VIEW_STUDENT',
                resource: 'STUDENT',
                resource_id: '423e4567-e89b-12d3-a456-426614174003',
                details: { ip: '127.0.0.1' }
            })
            .expect(201)
            .expect((res) => {
                expect(res.body.id).toBeDefined();
                expect(res.body.action).toBe('VIEW_STUDENT');
            });
    });

    it('/audit (GET)', () => {
        return supertest(app.getHttpServer())
            .get(`/audit?schoolId=${schoolId}`)
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBeGreaterThan(0);
            });
    });
});
