import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotificationsService,
  NotificationChannel,
  NotificationStatus,
} from './notifications.service';
import { AlertDelivery } from '../alerts/entities/alert-delivery.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockDeliveriesRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((row) =>
        Promise.resolve({ id: 'delivery-uuid', ...row }),
      ),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(AlertDelivery),
          useValue: mockDeliveriesRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs a notification attempt as a stx_alert_deliveries row', async () => {
    const result = await service.logNotificationAttempt(
      'alert-123',
      'parent-uuid',
      NotificationChannel.PUSH,
      NotificationStatus.SENT,
    );

    expect(mockDeliveriesRepo.create).toHaveBeenCalledWith({
      alertId: 'alert-123',
      userId: 'parent-uuid',
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT,
    });
    expect(mockDeliveriesRepo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('sendPushNotification persists a delivery row', async () => {
    await service.sendPushNotification('alert-456', 'parent-uuid');
    expect(mockDeliveriesRepo.save).toHaveBeenCalled();
  });

  it('returns an empty array when no deliveries exist for a parent', async () => {
    const result = await service.getParentNotifications(
      'parent-uuid',
      'sta-001',
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('joins on stx_alerts for tenant isolation when staId is provided', async () => {
    const innerJoinMock = jest.fn().mockReturnThis();
    const getManyMock = jest.fn().mockResolvedValue([
      {
        id: 'delivery-1',
        alertId: 'alert-123',
        userId: 'parent-uuid',
        channel: 'push',
        status: 'sent',
        createdAt: new Date(),
      },
    ]);
    mockDeliveriesRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      innerJoin: innerJoinMock,
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: getManyMock,
    });

    const result = await service.getParentNotifications(
      'parent-uuid',
      'sta-001',
    );

    expect(innerJoinMock).toHaveBeenCalled();
    expect(result.length).toBe(1);
  });
});
