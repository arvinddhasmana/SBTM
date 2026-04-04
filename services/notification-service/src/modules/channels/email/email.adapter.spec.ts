import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailAdapter } from './email.adapter';

describe('EmailAdapter', () => {
  let adapter: EmailAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'EMAIL_DRY_RUN') return 'true';
              if (key === 'EMAIL_FROM') return 'test@sbtm.local';
              return defaultVal ?? '';
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<EmailAdapter>(EmailAdapter);
    await adapter.onModuleInit();
  });

  it('should return success in dry-run mode', async () => {
    const result = await adapter.send(
      'parent@example.com',
      'Test Subject',
      '<p>Test</p>',
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('dry-run');
  });
});
