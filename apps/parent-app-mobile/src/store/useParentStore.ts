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

      // Collect all route IDs from all children
      const routeIds: string[] = [];
      children.forEach((child) => {
        if (child.amRouteId) routeIds.push(child.amRouteId);
        if (child.pmRouteId) routeIds.push(child.pmRouteId);
      });

      const alerts = await ParentApiService.getActiveAlerts(routeIds);
      set({ activeAlerts: alerts, isLoadingAlerts: false });
    } catch (error) {
      console.error('Failed to refresh alerts:', error);
      set({ isLoadingAlerts: false });
      throw error;
    }
  },
}));
