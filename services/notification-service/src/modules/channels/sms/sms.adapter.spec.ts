import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsAdapter } from './sms.adapter';

describe('SmsAdapter', () => {
  let adapter: SmsAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'SMS_DRY_RUN') return 'true';
              return defaultVal ?? '';
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<SmsAdapter>(SmsAdapter);
    await adapter.onModuleInit();
  });

  it('should return success in dry-run mode', async () => {
    const result = await adapter.send('+15551234567', 'Test SMS');

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('dry-run');
  });
});
