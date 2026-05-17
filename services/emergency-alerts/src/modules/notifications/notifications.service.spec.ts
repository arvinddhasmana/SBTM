import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import {
  AlertNotificationLog,
  NotificationChannel,
  NotificationStatus,
} from '../alerts/entities/alert-notification-log.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockLogRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((log) => Promise.resolve({ id: 'log-uuid', ...log })),
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
          provide: getRepositoryToken(AlertNotificationLog),
          useValue: mockLogRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log a notification attempt', async () => {
    const result = await service.logNotificationAttempt(
      'alert-123',
      'parent-uuid',
      NotificationChannel.PUSH,
      NotificationStatus.SENT,
    );

    expect(mockLogRepo.create).toHaveBeenCalledWith({
      alertId: 'alert-123',
      recipientUserId: 'parent-uuid',
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT,
    });
    expect(mockLogRepo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should call sendPushNotification and log the attempt', async () => {
    await service.sendPushNotification('alert-456', 'parent-uuid');
    expect(mockLogRepo.save).toHaveBeenCalled();
  });

  it('should return empty array when no notifications exist for parent', async () => {
    const result = await service.getParentNotifications(
      'parent-uuid',
      'school-001',
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('should query notifications with tenant isolation when schoolId provided', async () => {
    const innerJoinMock = jest.fn().mockReturnThis();
    const getManyMock = jest.fn().mockResolvedValue([
      {
        id: 'log-1',
        alertId: 'alert-123',
        recipientUserId: 'parent-uuid',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.SENT,
        timestamp: new Date(),
      },
    ]);
    mockLogRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      innerJoin: innerJoinMock,
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: getManyMock,
    });

    const result = await service.getParentNotifications(
      'parent-uuid',
      'school-001',
    );

    expect(innerJoinMock).toHaveBeenCalled();
    expect(result.length).toBe(1);
  });
});
