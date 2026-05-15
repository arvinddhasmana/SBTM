/**
 * Page Visibility API Client
 *
 * Provides typed access to the page visibility endpoints.
 * GET is available to all admin roles so the sidebar can filter nav items.
 * PUT is SUPER_ADMIN only (enforced on the backend).
 *
 * Classification: T2 — admin configuration, no student PII.
 */
import { apiClient } from './api-client';

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
  updatedAt: string;
  updatedBy?: string;
}

export const pageVisibilityApi = {
  /**
   * Returns visibility state for all hideable pages.
   * Pages with no DB record default to visible.
   */
  async getAll(): Promise<PageVisibilityRecord[]> {
    const response = await apiClient.get<PageVisibilityRecord[]>('/api/v1/page-visibility');
    return response.data;
  },

  /**
   * Upserts visibility for one page. SUPER_ADMIN only.
   */
  async update(
    pageKey: HideablePageKey,
    isVisible: boolean,
    pageName: string,
  ): Promise<PageVisibilityRecord> {
    const response = await apiClient.put<PageVisibilityRecord>('/api/v1/page-visibility', {
      pageKey,
      isVisible,
      pageName,
    });
    return response.data;
  },
};
