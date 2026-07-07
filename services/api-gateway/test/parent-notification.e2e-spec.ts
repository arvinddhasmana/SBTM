import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import * as request_ from 'supertest';
const supertest = request_ as any;
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { Role } from '@sbtm/common';
import { ParentController } from '../src/modules/gateway/controllers/parent.controller';
import { AbsenceController } from '../src/modules/gateway/controllers/absence.controller';
import { NotificationSettingsController } from '../src/modules/gateway/controllers/notification-settings.controller';
import { ParentGatewayService } from '../src/modules/gateway/services/parent.gateway.service';
import { AbsenceGatewayService } from '../src/modules/gateway/services/absence.gateway.service';
import { NotificationSettingsGatewayService } from '../src/modules/gateway/services/notification-settings.gateway.service';

const MOCK_PARENT_USER = {
  id: 'parent-user-1',
  email: 'parent@test.com',
  role: Role.PARENT,
  anchorKind: null,
  anchorId: null,
  preferredLanguage: 'en',
};

const mockJwtAuthGuard = {
  canActivate: (ctx: ExecutionContext) => {
    ctx.switchToHttp().getRequest().user = MOCK_PARENT_USER;
    return true;
  },
};

describe('Parent & Notification controller smoke tests (e2e)', () => {
  let app: INestApplication;

  const mockParentService = {
    getChildrenForParent: jest
      .fn()
      .mockResolvedValue([
        {
          id: 'student-1',
          name: 'Student OCSB-001',
          status: 'at_school',
          schoolName: 'St. Bernadette',
        },
      ]),
    getNotificationsForParent: jest.fn().mockResolvedValue([{ id: 'n-1' }]),
    getAlertStream: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
  };

  const mockAbsenceService = {
    reportAbsence: jest
      .fn()
      .mockResolvedValue({ id: 'abs-1', confirmationStatus: 'pending' }),
  };

  const mockNotificationSettingsService = {
    getNotificationPreferences: jest.fn().mockResolvedValue([]),
    updateNotificationPreferences: jest.fn().mockResolvedValue(undefined),
    registerDeviceToken: jest.fn().mockResolvedValue({ id: 'token-1' }),
    deactivateDeviceToken: jest.fn().mockResolvedValue({ deactivated: true }),
    getDeviceTokens: jest.fn().mockResolvedValue([]),
    getDeliveryLog: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [
        ParentController,
        AbsenceController,
        NotificationSettingsController,
      ],
      providers: [
        { provide: ParentGatewayService, useValue: mockParentService },
        { provide: AbsenceGatewayService, useValue: mockAbsenceService },
        {
          provide: NotificationSettingsGatewayService,
          useValue: mockNotificationSettingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockParentService.getChildrenForParent.mockResolvedValue([
      {
        id: 'student-1',
        name: 'Student OCSB-001',
        status: 'at_school',
        schoolName: 'St. Bernadette',
      },
    ]);
    mockAbsenceService.reportAbsence.mockResolvedValue({
      id: 'abs-1',
      confirmationStatus: 'pending',
    });
    mockNotificationSettingsService.getNotificationPreferences.mockResolvedValue(
      [],
    );
    mockNotificationSettingsService.updateNotificationPreferences.mockResolvedValue(
      undefined,
    );
  });

  describe('GET /api/v1/parent/children', () => {
    it('returns 200 with children array', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/parent/children')
        .expect(200)
        .expect((res: any) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0].id).toBe('student-1');
        });
      expect(mockParentService.getChildrenForParent).toHaveBeenCalledWith(
        MOCK_PARENT_USER,
      );
    });

    it('returns 200 with empty array when parent has no children', async () => {
      mockParentService.getChildrenForParent.mockResolvedValueOnce([]);
      await supertest(app.getHttpServer())
        .get('/api/v1/parent/children')
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  describe('GET /api/v1/notification-preferences', () => {
    it('returns 200 with preferences array', async () => {
      mockNotificationSettingsService.getNotificationPreferences.mockResolvedValueOnce(
        [{ eventType: 'PANIC_BUTTON', channel: 'push', enabled: true }],
      );
      await supertest(app.getHttpServer())
        .get('/api/v1/notification-preferences')
        .expect(200)
        .expect((res: any) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0].eventType).toBe('PANIC_BUTTON');
        });
    });

    it('returns 200 with empty array when no prefs stored', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/notification-preferences')
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  describe('PUT /api/v1/notification-preferences', () => {
    it('returns 200 { success: true } after updating preferences', async () => {
      await supertest(app.getHttpServer())
        .put('/api/v1/notification-preferences')
        .send({
          preferences: [
            { eventType: 'PANIC_BUTTON', channel: 'push', enabled: false },
          ],
        })
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toEqual({ success: true });
        });
      expect(
        mockNotificationSettingsService.updateNotificationPreferences,
      ).toHaveBeenCalledWith(MOCK_PARENT_USER.id, [
        { eventType: 'PANIC_BUTTON', channel: 'push', enabled: false },
      ]);
    });
  });

  describe('POST /api/v1/absences', () => {
    const validAbsenceBody = {
      studentId: '30000000-0000-0001-0000-000000000001',
      tripDate: '2026-05-21',
      routeType: 'AM',
    };

    it('returns 201 with absence record on valid input', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/absences')
        .send(validAbsenceBody)
        .expect(201)
        .expect((res: any) => {
          expect(res.body.id).toBe('abs-1');
          expect(res.body.confirmationStatus).toBe('pending');
        });
    });

    it('returns 400 when studentId is missing', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/absences')
        .send({ tripDate: '2026-05-21', routeType: 'AM' })
        .expect(400);
    });

    it('returns 400 when routeType is invalid', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/absences')
        .send({ ...validAbsenceBody, routeType: 'INVALID' })
        .expect(400);
    });

    it('returns 400 when tripDate is not an ISO date string', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/absences')
        .send({ ...validAbsenceBody, tripDate: 'not-a-date' })
        .expect(400);
    });
  });
});
