import { Test, TestingModule } from '@nestjs/testing';
import { NotificationProcessor } from './notification.processor';
import { NotificationRouterService } from './notification-router.service';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let mockRouter: any;

  beforeEach(async () => {
    mockRouter = {
      route: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: NotificationRouterService,
          useValue: mockRouter,
        },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
  });

  it('should process a valid notification-request job', async () => {
    const job = {
      id: 'job-1',
      name: 'notification-request',
      data: {
        eventType: 'BOARD',
        eventSourceId: 'event-1',
        recipientUserId: 'user-1',
        schoolId: 'school-1',
        routeId: 'route-1',
        studentId: 'student-1',
      },
    } as any;

    const result = await processor.process(job);

    expect(mockRouter.route).toHaveBeenCalledWith(job.data);
    expect(result).toEqual({ processed: true });
  });

  it('should skip jobs with unknown names', async () => {
    const job = {
      id: 'job-2',
      name: 'unknown-job',
      data: {},
    } as any;

    const result = await processor.process(job);

    expect(mockRouter.route).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: true });
  });

  it('should reject jobs missing required fields', async () => {
    const job = {
      id: 'job-3',
      name: 'notification-request',
      data: { eventType: 'BOARD' },
    } as any;

    const result = await processor.process(job);

    expect(mockRouter.route).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: false });
  });

  it('should process EMERGENCY events', async () => {
    const job = {
      id: 'job-4',
      name: 'notification-request',
      data: {
        eventType: 'EMERGENCY',
        eventSourceId: 'alert-1',
        recipientUserId: 'user-1',
        schoolId: 'school-1',
        emergencyType: 'PANIC_BUTTON',
      },
    } as any;

    await processor.process(job);

    expect(mockRouter.route).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EMERGENCY',
        emergencyType: 'PANIC_BUTTON',
      }),
    );
  });
});
