import { create } from 'zustand';
import { ParentApiService } from '../services/ParentApiService';
import { AuthService } from '../services/AuthService';
import { User, Child, Alert, NotificationPreferences, ParentStore } from '../types';

export const useParentStore = create<ParentStore>((set, get) => ({
  // Auth State
  user: null,
  isAuthenticated: false,

  // Data State
  children: [],
  activeAlerts: [],
  notificationPreferences: null,
  routeLiveLocations: {},

  // Loading States
  isLoadingChildren: false,
  isLoadingAlerts: false,

  // Network State
  isOffline: false,

  // Actions
  login: async (email: string, password: string) => {
    try {
      const response = await ParentApiService.login(email, password);
      set({
        user: response.user,
        isAuthenticated: true,
        children: response.user.children || [],
      });

      // Fetch additional data
      const children = await ParentApiService.getChildren();
      set({ children });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await AuthService.logout();
      set({
        user: null,
        isAuthenticated: false,
        children: [],
        activeAlerts: [],
        notificationPreferences: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setChildren: (children: Child[]) => {
    set({ children });
  },

  setActiveAlerts: (alerts: Alert[]) => {
    set({ activeAlerts: alerts });
  },

  setNotificationPreferences: (prefs: NotificationPreferences) => {
    set({ notificationPreferences: prefs });
  },

  setOffline: (offline: boolean) => {
    set({ isOffline: offline });
  },

  refreshChildren: async () => {
    try {
      set({ isLoadingChildren: true });
      const children = await ParentApiService.getChildren();
      set({ children, isLoadingChildren: false });
    } catch (error) {
      console.error('Failed to refresh children:', error);
      set({ isLoadingChildren: false });
      throw error;
    }
  },

  refreshAlerts: async () => {
    try {
      set({ isLoadingAlerts: true });
      const { children } = get();

      // Collect unique route IDs from all children. Two siblings often share
      // the same AM/PM route, so we dedupe before querying — otherwise the
      // alerts API is called twice for the same route and the dashboard
      // renders duplicate alert banners (and React warns about duplicate keys).
      const routeIdSet = new Set<string>();
      children.forEach((child) => {
        if (child.amRouteId) routeIdSet.add(child.amRouteId);
        if (child.pmRouteId) routeIdSet.add(child.pmRouteId);
      });
      const routeIds = Array.from(routeIdSet);

      const alerts = await ParentApiService.getActiveAlerts(routeIds);
      // Defensive: also dedupe by alert id in case the backend returns the
      // same physical alert under multiple route lookups.
      const seen = new Set<string>();
      const unique = (Array.isArray(alerts) ? alerts : []).filter((a) => {
        if (!a?.id || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      set({ activeAlerts: unique, isLoadingAlerts: false });
    } catch (error) {
      console.error('Failed to refresh alerts:', error);
      set({ isLoadingAlerts: false });
      throw error;
    }
  },

  refreshLiveLocations: async () => {
    try {
      const { children } = get();
      const routeIds = new Set<string>();
      children.forEach((c) => {
        if (c.amRouteId) routeIds.add(c.amRouteId);
        if (c.pmRouteId) routeIds.add(c.pmRouteId);
      });
      if (routeIds.size === 0) return;
      const ids = Array.from(routeIds);
      const results = await Promise.allSettled(
        ids.map((id) => ParentApiService.getLiveLocation(id)),
      );
      const next: Record<string, any> = {};
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) next[ids[idx]] = r.value;
      });
      set({ routeLiveLocations: next });
    } catch (error) {
      // Polling — silent failure
      console.warn('Failed to refresh live locations:', error);
    }
  },
}));
