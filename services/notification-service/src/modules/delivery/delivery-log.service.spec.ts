import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryLogService } from './delivery-log.service';
import { NotificationDeliveryLog } from './entities/notification-delivery-log.entity';

describe('DeliveryLogService', () => {
  let service: DeliveryLogService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn((data) => ({ id: 'log-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryLogService,
        {
          provide: getRepositoryToken(NotificationDeliveryLog),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DeliveryLogService>(DeliveryLogService);
  });

  it('creates a delivery log entry with optional board/school context', async () => {
    await service.create({
      schoolId: 'school-1',
      recipientUserId: 'user-1',
      eventType: 'BOARD',
      eventSourceId: 'event-1',
      channel: 'PUSH',
      status: 'SENT',
      providerMessageId: 'msg-123',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        boardId: null,
        channel: 'PUSH',
        status: 'SENT',
      }),
    );
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('creates a delivery log entry for an STA-scope alert (no school/board)', async () => {
    await service.create({
      recipientUserId: 'user-1',
      eventType: 'WEATHER_CLOSURE',
      eventSourceId: 'alert-1',
      channel: 'PUSH',
      status: 'SENT',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: null,
        boardId: null,
      }),
    );
  });

  it('persists boardId for board-scope alerts', async () => {
    await service.create({
      boardId: 'board-1',
      recipientUserId: 'user-1',
      eventType: 'ROUTE_CHANGE',
      eventSourceId: 'alert-2',
      channel: 'EMAIL',
      status: 'SENT',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'board-1',
        schoolId: null,
      }),
    );
  });

  it('updates delivery status', async () => {
    await service.updateStatus('log-1', 'DELIVERED', 'msg-123');

    expect(mockRepo.update).toHaveBeenCalledWith('log-1', {
      status: 'DELIVERED',
      providerMessageId: 'msg-123',
    });
  });

  it('gets delivery log for user (no schoolId required)', async () => {
    mockRepo.find.mockResolvedValue([]);

    await service.getForUser('user-1');

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { recipientUserId: 'user-1' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  });
});
