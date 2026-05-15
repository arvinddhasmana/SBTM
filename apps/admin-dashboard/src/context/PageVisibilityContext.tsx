/**
 * PageVisibilityContext
 *
 * Fetches page visibility settings from the API and exposes isPageVisible().
 * Super Admin always gets true — the visibility system only restricts other roles.
 * While data is loading, all pages are treated as visible to avoid flashing redirects.
 */
import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { pageVisibilityApi, type PageVisibilityRecord } from '../services/api/page-visibility.api';

interface PageVisibilityContextValue {
  /** Returns true if the given page should be visible for the current user. */
  isPageVisible: (pageKey: string) => boolean;
  records: PageVisibilityRecord[];
  isLoading: boolean;
}

const PageVisibilityContext = createContext<PageVisibilityContextValue>({
  isPageVisible: () => true,
  records: [],
  isLoading: false,
});

export const PageVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['page-visibility'],
    queryFn: () => pageVisibilityApi.getAll(),
    enabled: isAuthenticated && !!user,
    staleTime: 60_000,
  });

  const isPageVisible = (pageKey: string): boolean => {
    // Super Admin bypasses visibility restrictions entirely
    if (user?.role === 'SUPER_ADMIN') return true;
    // While loading, treat all pages as visible to avoid flashing redirects
    if (isLoading || records.length === 0) return true;
    const record = records.find((r) => r.pageKey === pageKey);
    // Pages without a record default to visible
    return record?.isVisible ?? true;
  };

  return (
    <PageVisibilityContext.Provider value={{ isPageVisible, records, isLoading }}>
      {children}
    </PageVisibilityContext.Provider>
  );
};

export const usePageVisibility = () => useContext(PageVisibilityContext);
