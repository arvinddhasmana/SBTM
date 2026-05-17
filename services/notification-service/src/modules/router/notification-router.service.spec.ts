import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotificationRouterService } from './notification-router.service';
import { TokensService } from '../tokens/tokens.service';
import { DeliveryLogService } from '../delivery/delivery-log.service';
import { FcmAdapter } from '../channels/fcm/fcm.adapter';
import { EmailAdapter } from '../channels/email/email.adapter';
import { SmsAdapter } from '../channels/sms/sms.adapter';

/**
 * v2: PreferencesService is gone (v1 NotificationPreference dropped in Phase B);
 * subscription enforcement moved upstream to stx_alert_subscriptions in api-gateway.
 * Until that wiring lands, the router uses a permissive default channel set:
 *   - EMERGENCY → ['PUSH', 'SMS']
 *   - everything else → ['PUSH', 'EMAIL', 'SMS']
 */
describe('NotificationRouterService (v2)', () => {
  let service: NotificationRouterService;
  let mockTokens: {
    getActiveTokensForUser: jest.Mock;
    deactivateByToken: jest.Mock;
  };
  let mockDeliveryLog: { create: jest.Mock };
  let mockFcm: { sendToDevices: jest.Mock };
  let mockEmail: { send: jest.Mock };
  let mockSms: { send: jest.Mock };
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    mockTokens = {
      getActiveTokensForUser: jest
        .fn()
        .mockResolvedValue([{ token: 'fcm-token-1' }]),
      deactivateByToken: jest.fn(),
    };
    mockDeliveryLog = { create: jest.fn().mockResolvedValue({ id: 'log-1' }) };
    mockFcm = {
      sendToDevices: jest
        .fn()
        .mockResolvedValue([{ success: true, messageId: 'msg-1' }]),
    };
    mockEmail = {
      send: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'email-1' }),
    };
    mockSms = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-1' }),
    };
    mockDataSource = {
      query: jest
        .fn()
        .mockResolvedValue([
          { email: 'parent@test.com', phone: '+15551234567' },
        ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRouterService,
        { provide: TokensService, useValue: mockTokens },
        { provide: DeliveryLogService, useValue: mockDeliveryLog },
        { provide: FcmAdapter, useValue: mockFcm },
        { provide: EmailAdapter, useValue: mockEmail },
        { provide: SmsAdapter, useValue: mockSms },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<NotificationRouterService>(NotificationRouterService);
  });

  const baseRequest = {
    eventType: 'BOARD',
    eventSourceId: 'event-1',
    recipientUserId: 'user-1',
    schoolId: 'school-1',
    routeId: 'route-1',
    studentId: 'student-1',
  };

  it('routes BOARD via PUSH (and falls through EMAIL/SMS permissively)', async () => {
    await service.route(baseRequest);

    expect(mockFcm.sendToDevices).toHaveBeenCalledWith(
      ['fcm-token-1'],
      expect.objectContaining({
        title: 'Child Boarded',
        body: 'Your child has boarded the bus.',
      }),
    );
    expect(mockDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'PUSH',
        status: 'SENT',
        schoolId: 'school-1',
      }),
    );
    // Permissive default: EMAIL + SMS also attempted.
    expect(mockEmail.send).toHaveBeenCalled();
    expect(mockSms.send).toHaveBeenCalled();
  });

  it('routes EMERGENCY via PUSH and SMS (skips EMAIL)', async () => {
    await service.route({
      ...baseRequest,
      eventType: 'EMERGENCY',
      emergencyType: 'PANIC_BUTTON',
    });

    expect(mockFcm.sendToDevices).toHaveBeenCalled();
    expect(mockSms.send).toHaveBeenCalledWith(
      '+15551234567',
      expect.stringContaining('Emergency'),
    );
    expect(mockEmail.send).not.toHaveBeenCalled();
  });

  it('does not double-escalate when EMERGENCY already includes SMS', async () => {
    mockFcm.sendToDevices.mockResolvedValue([
      { success: false, error: 'UNAVAILABLE' },
    ]);

    await service.route({
      ...baseRequest,
      eventType: 'EMERGENCY',
      emergencyType: 'PANIC_BUTTON',
    });

    // SMS fires once (as part of the default EMERGENCY channel set), not twice
    // (no extra fallback escalation, since SMS is already in `channels`).
    expect(mockSms.send).toHaveBeenCalledTimes(1);
  });

  it('does not escalate to SMS for non-EMERGENCY push failure', async () => {
    mockFcm.sendToDevices.mockResolvedValue([
      { success: false, error: 'UNAVAILABLE' },
    ]);

    await service.route(baseRequest);

    // SMS still fires once because it's part of the permissive default channel
    // set for non-EMERGENCY — but it must NOT fire a second time as an
    // escalation. Assert exactly-once.
    expect(mockSms.send).toHaveBeenCalledTimes(1);
  });

  it('logs FAILED when no device tokens exist', async () => {
    mockTokens.getActiveTokensForUser.mockResolvedValue([]);

    await service.route(baseRequest);

    expect(mockDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'PUSH',
        status: 'FAILED',
        failureReason: 'NO_DEVICE_TOKENS',
      }),
    );
  });

  it('deactivates invalid FCM tokens', async () => {
    mockFcm.sendToDevices.mockResolvedValue([
      { success: false, error: 'INVALID_TOKEN' },
    ]);

    await service.route(baseRequest);

    expect(mockTokens.deactivateByToken).toHaveBeenCalledWith('fcm-token-1');
  });

  it('routes EMAIL channel content', async () => {
    await service.route(baseRequest);

    expect(mockEmail.send).toHaveBeenCalledWith(
      'parent@test.com',
      'Child Boarded',
      expect.stringContaining('boarded'),
    );
  });

  it('logs FAILED EMAIL when no email address exists', async () => {
    mockDataSource.query.mockResolvedValue([{ email: null, phone: null }]);

    await service.route(baseRequest);

    expect(mockDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'EMAIL',
        status: 'FAILED',
        failureReason: 'NO_EMAIL_ADDRESS',
      }),
    );
  });

  it('logs FAILED SMS when no phone number exists', async () => {
    mockDataSource.query.mockResolvedValue([
      { email: 'parent@test.com', phone: null },
    ]);

    await service.route(baseRequest);

    expect(mockDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'SMS',
        status: 'FAILED',
        failureReason: 'NO_PHONE_NUMBER',
      }),
    );
  });
});
