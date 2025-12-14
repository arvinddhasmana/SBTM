import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
    let service: StorageService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StorageService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const config = {
                                STORAGE_TYPE: 'local',
                                STORAGE_BASE_URL: 'http://localhost:3005',
                                PRESIGNED_URL_EXPIRY: '3600',
                            };
                            return config[key] || defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<StorageService>(StorageService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generatePresignedUploadUrls', () => {
        it('should generate local storage URLs', async () => {
            const videoEventId = 'test-event-123';
            const urls = await service.generatePresignedUploadUrls(videoEventId);

            expect(urls).toHaveProperty('uploadUrl');
            expect(urls).toHaveProperty('thumbnailUploadUrl');
            expect(urls.uploadUrl).toContain(videoEventId);
            expect(urls.thumbnailUploadUrl).toContain(videoEventId);
        });
    });

    describe('extractObjectKeyFromUrl', () => {
        it('should extract object key from URL', () => {
            const url = 'http://localhost:9000/videos/test-key/file.mp4';
            const key = service.extractObjectKeyFromUrl(url);
            expect(key).toBeTruthy();
        });
    });
});
