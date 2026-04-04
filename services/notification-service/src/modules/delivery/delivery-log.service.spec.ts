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

  it('should create a delivery log entry', async () => {
    const result = await service.create({
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
        channel: 'PUSH',
        status: 'SENT',
      }),
    );
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should update delivery status', async () => {
    await service.updateStatus('log-1', 'DELIVERED', 'msg-123');

    expect(mockRepo.update).toHaveBeenCalledWith('log-1', {
      status: 'DELIVERED',
      providerMessageId: 'msg-123',
    });
  });

  it('should get delivery log for user with school_id scoping', async () => {
    mockRepo.find.mockResolvedValue([]);

    await service.getForUser('user-1', 'school-1');

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { recipientUserId: 'user-1', schoolId: 'school-1' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  });
});
