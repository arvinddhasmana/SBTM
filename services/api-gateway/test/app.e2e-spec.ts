import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/auth/login (POST)', () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ username: 'admin', password: 'admin' })
            .expect(201)
            .expect((res) => {
                expect(res.body.access_token).toBeDefined();
            });
    });

    it('/auth/login (POST) - Fail', () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ username: 'admin', password: 'wrong' })
            .expect(401);
    });
});
