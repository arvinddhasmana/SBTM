import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Videos from './Videos';

const { mockVideos, mockRoutes } = vi.hoisted(() => ({
  mockVideos: [
    {
      id: 'vid-1',
      routeId: 'R-101',
      vehicleId: 'BUS-01',
      eventType: 'INCIDENT',
      timestamp: new Date().toISOString(),
      videoUrl: 'https://example.com/video1.mp4',
      durationSeconds: 120,
    },
    {
      id: 'vid-2',
      routeId: 'R-102',
      vehicleId: 'BUS-02',
      eventType: 'BOARD',
      timestamp: new Date().toISOString(),
      videoUrl: 'https://example.com/video2.mp4',
      durationSeconds: 60,
    },
  ],
  mockRoutes: [
    { id: 'R-101', name: 'Route 101', direction: 'AM', status: 'active', stops: [] },
    { id: 'R-102', name: 'Route 102', direction: 'PM', status: 'active', stops: [] },
  ],
}));

vi.mock('../services/api', () => ({
  videoApi: {
    getVideoEvents: vi.fn().mockResolvedValue(mockVideos),
  },
  routesApi: {
    getAllRoutes: vi.fn().mockResolvedValue(mockRoutes),
  },
}));

describe('Videos Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderVideos = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Videos />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderVideos();
    expect(screen.getByText(/Loading video events/i)).toBeInTheDocument();
  });

  it('renders video event review header after loading', async () => {
    renderVideos();
    await waitFor(() => {
      expect(screen.getByText('Video Event Review')).toBeInTheDocument();
    });
  });

  it('shows filter controls', async () => {
    renderVideos();
    await waitFor(() => {
      expect(screen.getByText('Filters:')).toBeInTheDocument();
    });
  });

  it('displays video count in subtitle', async () => {
    renderVideos();
    await waitFor(() => {
      expect(screen.getByText('2 video events')).toBeInTheDocument();
    });
  });
});
