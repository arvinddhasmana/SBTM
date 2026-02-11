
import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmergencyAlert } from './entities/emergency-alert.entity'; // Fixed path
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { BullModule, getQueueToken } from '@nestjs/bullmq';

describe('AlertsService', () => {
    let service: AlertsService;

    const mockRepository = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((alert) => Promise.resolve({ id: 'uuid', ...alert })),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findOneBy: jest.fn().mockResolvedValue(null),
    };

    const mockQueue = {
        add: jest.fn(),
    };

    const mockGateway = {
        broadcastAlert: jest.fn(),
    };

    const mockNotifications = {
        sendPushNotification: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AlertsService,
                {
                    provide: getRepositoryToken(EmergencyAlert),
                    useValue: mockRepository,
                },
                {
                    provide: getQueueToken('alerts'),
                    useValue: mockQueue,
                },
                {
                    provide: WebsocketGateway,
                    useValue: mockGateway,
                },
                {
                    provide: NotificationsService,
                    useValue: mockNotifications,
                },
            ],
        }).compile();

        service = module.get<AlertsService>(AlertsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create an alert', async () => {
        const dto = {
            schoolId: 'school-001',
            vehicleId: 'v1',
            routeId: 'r1',
            driverId: 'd1',
            timestamp: new Date().toISOString(),
            lat: 10,
            lng: 10,
            eventType: 'PANIC_BUTTON' as any,
        };

        const result = await service.create(dto);
        expect(result).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockQueue.add).toHaveBeenCalled();
        expect(mockGateway.broadcastAlert).toHaveBeenCalled();
        expect(mockNotifications.sendPushNotification).toHaveBeenCalled();
    });
});
