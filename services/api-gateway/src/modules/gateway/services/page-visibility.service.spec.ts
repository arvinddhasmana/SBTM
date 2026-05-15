/**
 * Unit tests for PageVisibilityService
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PageVisibility } from '../entities/page-visibility.entity';
import {
  PageVisibilityService,
  HIDEABLE_PAGE_KEYS,
} from './page-visibility.service';

const mockRepo = {
  find: jest.fn(),
  upsert: jest.fn(),
  findOneByOrFail: jest.fn(),
};

describe('PageVisibilityService', () => {
  let service: PageVisibilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageVisibilityService,
        { provide: getRepositoryToken(PageVisibility), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PageVisibilityService>(PageVisibilityService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all hideable page keys', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toHaveLength(HIDEABLE_PAGE_KEYS.length);
      HIDEABLE_PAGE_KEYS.forEach((key) => {
        expect(result.find((r) => r.pageKey === key)).toBeDefined();
      });
    });

    it('defaults to isVisible: true for pages with no DB row', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      result.forEach((r) => expect(r.isVisible).toBe(true));
    });

    it('returns stored visibility when row exists', async () => {
      const row: Partial<PageVisibility> = {
        pageKey: 'alerts',
        pageName: 'Alerts',
        isVisible: false,
        updatedBy: 'super-1',
        updatedAt: new Date('2026-05-14T00:00:00Z'),
      };
      mockRepo.find.mockResolvedValue([row]);
      const result = await service.findAll();
      const alertsEntry = result.find((r) => r.pageKey === 'alerts');
      expect(alertsEntry?.isVisible).toBe(false);
      expect(alertsEntry?.pageName).toBe('Alerts');
      expect(alertsEntry?.updatedBy).toBe('super-1');
    });
  });

  describe('update', () => {
    it('upserts the record and returns it', async () => {
      const updated: Partial<PageVisibility> = {
        pageKey: 'vehicles',
        pageName: 'Fleet',
        isVisible: false,
        updatedBy: 'super-admin-1',
        updatedAt: new Date('2026-05-14T00:00:00Z'),
      };
      mockRepo.upsert.mockResolvedValue(undefined);
      mockRepo.findOneByOrFail.mockResolvedValue(updated);

      const result = await service.update(
        'vehicles',
        false,
        'Fleet',
        'super-admin-1',
      );

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        {
          pageKey: 'vehicles',
          pageName: 'Fleet',
          isVisible: false,
          updatedBy: 'super-admin-1',
        },
        ['pageKey'],
      );
      expect(result.isVisible).toBe(false);
      expect(result.pageKey).toBe('vehicles');
    });

    it('can re-enable a hidden page', async () => {
      const updated: Partial<PageVisibility> = {
        pageKey: 'alerts',
        pageName: 'Alerts',
        isVisible: true,
        updatedBy: 'super-admin-1',
        updatedAt: new Date(),
      };
      mockRepo.upsert.mockResolvedValue(undefined);
      mockRepo.findOneByOrFail.mockResolvedValue(updated);

      const result = await service.update(
        'alerts',
        true,
        'Alerts',
        'super-admin-1',
      );
      expect(result.isVisible).toBe(true);
    });
  });
});
