import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FcmAdapter } from './fcm.adapter';

describe('FcmAdapter', () => {
  let adapter: FcmAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'FCM_DRY_RUN') return 'true';
              return defaultVal ?? '';
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<FcmAdapter>(FcmAdapter);
    await adapter.onModuleInit();
  });

  it('should return success in dry-run mode', async () => {
    const result = await adapter.sendToDevice('fake-token', {
      title: 'Test',
      body: 'Test body',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('dry-run');
  });

  it('should batch send to multiple devices', async () => {
    const results = await adapter.sendToDevices(['token-1', 'token-2'], {
      title: 'Test',
      body: 'Test body',
    });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
  });
});
