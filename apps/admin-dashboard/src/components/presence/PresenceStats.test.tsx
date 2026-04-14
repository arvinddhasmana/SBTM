import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PresenceStats } from './PresenceStats';

const mockStats = {
  totalStudents: 100,
  boarded: 65,
  alighted: 30,
  unknown: 5,
};

describe('PresenceStats', () => {
  it('renders all stat labels', () => {
    render(<PresenceStats stats={mockStats} />);
    expect(screen.getByText('Total Tracked')).toBeInTheDocument();
    expect(screen.getByText('Boarded')).toBeInTheDocument();
    expect(screen.getByText('Alighted')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders stat values correctly', () => {
    render(<PresenceStats stats={mockStats} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows loading placeholder when loading is true', () => {
    render(<PresenceStats stats={mockStats} loading={true} />);
    const loadingPlaceholders = screen.getAllByText('...');
    expect(loadingPlaceholders.length).toBe(4);
  });
});
