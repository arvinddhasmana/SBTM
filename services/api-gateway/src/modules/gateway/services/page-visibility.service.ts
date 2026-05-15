/**
 * PageVisibilityService
 *
 * Manages which admin portal pages are visible to non-Super-Admin users.
 * Super Admin always has full access regardless of visibility state.
 *
 * Pages without a database row default to visible (safe default).
 * The Settings page and the page-visibility management page itself are
 * excluded from this system — they are always accessible.
 *
 * Classification: T2 — admin configuration, no student PII.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageVisibility } from '../entities/page-visibility.entity';

export const HIDEABLE_PAGE_KEYS = [
  'dashboard',
  'alerts',
  'alerts/operational',
  'routes',
  'routes/planner',
  'vehicles',
  'compliance',
  'fleet-assignments',
  'students',
  'absences',
  'boards',
  'schools',
  'users',
  'alert-config',
  'settings/gps-source',
  'tenant-overview',
  'videos',
] as const;

export type HideablePageKey = (typeof HIDEABLE_PAGE_KEYS)[number];

export interface PageVisibilityRecord {
  pageKey: string;
  pageName: string;
  isVisible: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

@Injectable()
export class PageVisibilityService {
  constructor(
    @InjectRepository(PageVisibility)
    private readonly repo: Repository<PageVisibility>,
  ) {}

  /**
   * Returns visibility for all hideable pages.
   * Pages without a row in the DB are returned with isVisible: true.
   */
  async findAll(): Promise<PageVisibilityRecord[]> {
    const rows = await this.repo.find();
    return HIDEABLE_PAGE_KEYS.map((key) => {
      const row = rows.find((r) => r.pageKey === key);
      return {
        pageKey: key,
        pageName: row?.pageName ?? key,
        isVisible: row?.isVisible ?? true,
        updatedAt: row?.updatedAt ?? new Date(0),
        updatedBy: row?.updatedBy,
      };
    });
  }

  /**
   * Upserts visibility for a single page.
   * updatedBy must be the Super Admin's user ID (never a name or email).
   */
  async update(
    pageKey: HideablePageKey,
    isVisible: boolean,
    pageName: string,
    updatedBy: string,
  ): Promise<PageVisibilityRecord> {
    await this.repo.upsert({ pageKey, pageName, isVisible, updatedBy }, [
      'pageKey',
    ]);
    const row = await this.repo.findOneByOrFail({ pageKey });
    return {
      pageKey: row.pageKey,
      pageName: row.pageName,
      isVisible: row.isVisible,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }
}
