import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VideoPlayer from './VideoPlayer';

vi.mock('../../utils/formatters', () => ({
  formatTimestamp: vi.fn().mockReturnValue('Apr 14, 10:30 AM'),
  formatEventType: vi.fn().mockReturnValue('Incident'),
}));

const mockVideo = {
  id: 'vid-1',
  routeId: 'R-101',
  vehicleId: 'BUS-01',
  eventType: 'INCIDENT',
  timestamp: new Date().toISOString(),
  videoUrl: 'https://example.com/video1.mp4',
  durationSeconds: 125,
};

describe('VideoPlayer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPlayer = () => {
    return render(<VideoPlayer video={mockVideo} onClose={mockOnClose} />);
  };

  it('renders video event info', () => {
    renderPlayer();
    expect(screen.getByText('Incident')).toBeInTheDocument();
    expect(screen.getAllByText(/BUS-01/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays route, vehicle, and duration info', () => {
    renderPlayer();
    expect(screen.getByText('R-101')).toBeInTheDocument();
    expect(screen.getByText('BUS-01')).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderPlayer();
    // The close button is the last button in the header
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
