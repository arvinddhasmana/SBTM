import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PreferencesService } from './preferences.service';
import { NotificationPreference } from './entities/notification-preference.entity';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'pref-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  it('should get preferences for user', async () => {
    const prefs = [{ eventType: 'BOARD', channel: 'PUSH', enabled: true }];
    mockRepo.find.mockResolvedValue(prefs);

    const result = await service.getForUser('user-1', 'school-1');
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1', schoolId: 'school-1' },
      order: { eventType: 'ASC', channel: 'ASC' },
    });
    expect(result).toEqual(prefs);
  });

  it('should force EMERGENCY preferences to always be enabled', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await service.upsert('user-1', 'school-1', [
      { eventType: 'EMERGENCY', channel: 'PUSH', enabled: false },
    ]);

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('should update existing preference', async () => {
    const existing = {
      id: 'pref-1',
      userId: 'user-1',
      eventType: 'BOARD',
      channel: 'PUSH',
      enabled: true,
    };
    mockRepo.findOne.mockResolvedValue(existing);

    await service.upsert('user-1', 'school-1', [
      { eventType: 'BOARD', channel: 'PUSH', enabled: false },
    ]);

    expect(existing.enabled).toBe(false);
    expect(mockRepo.save).toHaveBeenCalledWith(existing);
  });

  it('should return PUSH and SMS for EMERGENCY events regardless of preferences', async () => {
    const channels = await service.getEnabledChannels('user-1', 'EMERGENCY');
    expect(channels).toEqual(['PUSH', 'SMS']);
  });

  it('should default to PUSH when no preferences exist', async () => {
    mockRepo.find.mockResolvedValue([]);

    const channels = await service.getEnabledChannels('user-1', 'BOARD');
    expect(channels).toEqual(['PUSH']);
  });

  it('should return enabled channels from preferences', async () => {
    mockRepo.find.mockResolvedValue([
      { channel: 'PUSH', enabled: true },
      { channel: 'EMAIL', enabled: true },
    ]);

    const channels = await service.getEnabledChannels('user-1', 'BOARD');
    expect(channels).toEqual(['PUSH', 'EMAIL']);
  });
});
