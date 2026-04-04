import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokensService } from './tokens.service';
import { DeviceToken } from './entities/device-token.entity';

describe('TokensService', () => {
  let service: TokensService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => ({ id: 'token-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: getRepositoryToken(DeviceToken), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  it('should register a new device token', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const result = await service.register(
      'user-1',
      'school-1',
      'fcm-token-abc',
      'android',
    );

    expect(mockRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      schoolId: 'school-1',
      token: 'fcm-token-abc',
      platform: 'android',
      isActive: true,
    });
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.userId).toBe('user-1');
  });

  it('should reactivate an existing token', async () => {
    const existing = {
      id: 'token-1',
      userId: 'user-1',
      token: 'fcm-token-abc',
      isActive: false,
      platform: 'ios',
    };
    mockRepo.findOne.mockResolvedValue(existing);

    const result = await service.register(
      'user-1',
      'school-1',
      'fcm-token-abc',
      'android',
    );

    expect(existing.isActive).toBe(true);
    expect(existing.platform).toBe('android');
    expect(mockRepo.save).toHaveBeenCalledWith(existing);
  });

  it('should deactivate a token', async () => {
    await service.deactivate('token-1', 'user-1');

    expect(mockRepo.update).toHaveBeenCalledWith(
      { id: 'token-1', userId: 'user-1' },
      { isActive: false },
    );
  });

  it('should deactivate by token string', async () => {
    await service.deactivateByToken('fcm-token-abc');

    expect(mockRepo.update).toHaveBeenCalledWith(
      { token: 'fcm-token-abc' },
      { isActive: false },
    );
  });

  it('should get active tokens for user', async () => {
    const tokens = [
      { id: 'token-1', userId: 'user-1', isActive: true, token: 'abc' },
    ];
    mockRepo.find.mockResolvedValue(tokens);

    const result = await service.getActiveTokensForUser('user-1');

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1', isActive: true },
    });
    expect(result).toEqual(tokens);
  });
});
