import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokensService } from './tokens.service';
import { DeviceToken } from './entities/device-token.entity';

/**
 * v2-followups #6: device_tokens is polymorphic across `users` (admin/driver)
 * and `stx_guardians` (parent). Specs cover both kinds.
 */
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

  it('registers a new device token for a user recipient', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const result = await service.register(
      'user',
      'user-1',
      'school-1',
      'fcm-token-abc',
      'android',
    );

    expect(mockRepo.create).toHaveBeenCalledWith({
      recipientKind: 'user',
      recipientId: 'user-1',
      schoolId: 'school-1',
      token: 'fcm-token-abc',
      platform: 'android',
      isActive: true,
    });
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.recipientId).toBe('user-1');
    expect(result.recipientKind).toBe('user');
  });

  it('registers a new device token for a guardian recipient', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const result = await service.register(
      'guardian',
      'grd-1',
      'school-1',
      'fcm-token-xyz',
      'ios',
    );

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientKind: 'guardian',
        recipientId: 'grd-1',
      }),
    );
    expect(result.recipientKind).toBe('guardian');
  });

  it('reactivates an existing token scoped by (kind, id, token)', async () => {
    const existing = {
      id: 'token-1',
      recipientKind: 'user',
      recipientId: 'user-1',
      token: 'fcm-token-abc',
      isActive: false,
      platform: 'ios',
    };
    mockRepo.findOne.mockResolvedValue(existing);

    await service.register(
      'user',
      'user-1',
      'school-1',
      'fcm-token-abc',
      'android',
    );

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: {
        recipientKind: 'user',
        recipientId: 'user-1',
        token: 'fcm-token-abc',
      },
    });
    expect(existing.isActive).toBe(true);
    expect(existing.platform).toBe('android');
    expect(mockRepo.save).toHaveBeenCalledWith(existing);
  });

  it('deactivates a token scoped by (id, kind, recipientId)', async () => {
    await service.deactivate('token-1', 'user', 'user-1');

    expect(mockRepo.update).toHaveBeenCalledWith(
      { id: 'token-1', recipientKind: 'user', recipientId: 'user-1' },
      { isActive: false },
    );
  });

  it('deactivates by token string regardless of recipient', async () => {
    await service.deactivateByToken('fcm-token-abc');

    expect(mockRepo.update).toHaveBeenCalledWith(
      { token: 'fcm-token-abc' },
      { isActive: false },
    );
  });

  it('gets active tokens for a user recipient', async () => {
    const tokens = [
      {
        id: 'token-1',
        recipientKind: 'user',
        recipientId: 'user-1',
        isActive: true,
        token: 'abc',
      },
    ];
    mockRepo.find.mockResolvedValue(tokens);

    const result = await service.getActiveTokensForRecipient('user', 'user-1');

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { recipientKind: 'user', recipientId: 'user-1', isActive: true },
    });
    expect(result).toEqual(tokens);
  });

  it('gets active tokens for a guardian recipient (kind isolation)', async () => {
    mockRepo.find.mockResolvedValue([]);
    await service.getActiveTokensForRecipient('guardian', 'grd-1');

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: {
        recipientKind: 'guardian',
        recipientId: 'grd-1',
        isActive: true,
      },
    });
  });

  it('listForRecipient scopes by kind, id, and school', async () => {
    mockRepo.find.mockResolvedValue([]);
    await service.listForRecipient('guardian', 'grd-1', 'school-1');

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: {
        recipientKind: 'guardian',
        recipientId: 'grd-1',
        schoolId: 'school-1',
      },
      order: { createdAt: 'DESC' },
    });
  });
});
