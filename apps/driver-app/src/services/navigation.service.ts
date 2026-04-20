import api from './api.service';

export const NavigationService = {
  getRoutePath: async (waypoints: { lat: number; lng: number }[]): Promise<string> => {
    const { data } = await api.post('/routes/snap-to-road', waypoints);
    return data.polyline || '';
  },
};
