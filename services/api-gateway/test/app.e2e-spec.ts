import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        app.setGlobalPrefix('api/v1');

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/api/v1/health (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/v1/health')
            .expect(200)
            .expect((res) => {
                expect(res.body.status).toBe('ok');
                expect(res.body.service).toBe('api-gateway');
                expect(res.body.timestamp).toBeDefined();
            });
    });
});
