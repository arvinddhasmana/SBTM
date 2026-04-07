import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const createAuthMock = (role: string) => ({
  user: { id: 'test-user', email: 'admin@test.com', name: 'Test Admin', role },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
});

const renderSidebar = (props = {}) => {
  const defaultProps = {
    width: 256,
    isCollapsed: false,
    onToggleCollapse: () => {},
    ...props,
  };
  return render(
    <BrowserRouter>
      <Sidebar {...defaultProps} />
    </BrowserRouter>,
  );
};

// All nav items that SUPER_ADMIN should see
const ALL_NAV_ITEMS = [
  'Dashboard',
  'Alerts',
  'Operational',
  'Routes',
  'Planner',
  'Fleet',
  'Compliance',
  'Assignments',
  'Students',
  'Absences',
  'Boards',
  'Schools',
  'Users',
  'Settings',
];

// Items available to all admin roles (without Fleet which is OSTA/SUPER only)
const COMMON_ADMIN_ITEMS = [
  'Dashboard',
  'Alerts',
  'Operational',
  'Routes',
  'Planner',
  'Compliance',
  'Assignments',
  'Students',
  'Absences',
  'Settings',
];

// Items only for OSTA and SUPER admin
const OSTA_ONLY_ITEMS = ['Fleet', 'Boards'];

describe('Sidebar', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(createAuthMock('SUPER_ADMIN'));
  });

  it('renders the logo and title', () => {
    renderSidebar();

    expect(screen.getByText('OSTA Admin')).toBeInTheDocument();
    expect(screen.getByText('Transport Management')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderSidebar();

    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('navigation links have correct paths', () => {
    renderSidebar();

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Alerts').closest('a')).toHaveAttribute('href', '/alerts');
    expect(screen.getByText('Routes').closest('a')).toHaveAttribute('href', '/routes');
    expect(screen.getByText('Students').closest('a')).toHaveAttribute('href', '/students');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
    expect(screen.getByText('Boards').closest('a')).toHaveAttribute('href', '/boards');
    expect(screen.getByText('Schools').closest('a')).toHaveAttribute('href', '/schools');
    expect(screen.getByText('Users').closest('a')).toHaveAttribute('href', '/users');
    expect(screen.getByText('Assignments').closest('a')).toHaveAttribute(
      'href',
      '/fleet-assignments',
    );
    expect(screen.getByText('Compliance').closest('a')).toHaveAttribute('href', '/compliance');
    expect(screen.getByText('Absences').closest('a')).toHaveAttribute('href', '/absences');
  });

  describe('SUPER_ADMIN role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createAuthMock('SUPER_ADMIN'));
    });

    it('sees all navigation items', () => {
      renderSidebar();

      ALL_NAV_ITEMS.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });
  });

  describe('OSTA_ADMIN role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createAuthMock('OSTA_ADMIN'));
    });

    it('sees common admin items plus Fleet, Boards and Schools', () => {
      renderSidebar();

      [...COMMON_ADMIN_ITEMS, 'Fleet', 'Boards', 'Schools'].forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('does not see Users', () => {
      renderSidebar();

      expect(screen.queryByText('Users')).not.toBeInTheDocument();
    });
  });

  describe('BOARD_ADMIN role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createAuthMock('BOARD_ADMIN'));
    });

    it('sees common admin items plus Schools', () => {
      renderSidebar();

      [...COMMON_ADMIN_ITEMS, 'Schools'].forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('does not see Fleet, Boards or Users', () => {
      renderSidebar();

      expect(screen.queryByText('Fleet')).not.toBeInTheDocument();
      expect(screen.queryByText('Boards')).not.toBeInTheDocument();
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
    });
  });

  describe('SCHOOL_ADMIN role', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createAuthMock('SCHOOL_ADMIN'));
    });

    it('sees common admin items only', () => {
      renderSidebar();

      COMMON_ADMIN_ITEMS.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('does not see Fleet, Boards, Schools, or Users', () => {
      renderSidebar();

      expect(screen.queryByText('Fleet')).not.toBeInTheDocument();
      expect(screen.queryByText('Boards')).not.toBeInTheDocument();
      expect(screen.queryByText('Schools')).not.toBeInTheDocument();
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
    });
  });

  describe('Non-admin roles (DRIVER, PARENT)', () => {
    it('DRIVER sees no navigation items', () => {
      mockUseAuth.mockReturnValue(createAuthMock('DRIVER'));
      renderSidebar();

      ALL_NAV_ITEMS.forEach((item) => {
        expect(screen.queryByText(item)).not.toBeInTheDocument();
      });
    });

    it('PARENT sees no navigation items', () => {
      mockUseAuth.mockReturnValue(createAuthMock('PARENT'));
      renderSidebar();

      ALL_NAV_ITEMS.forEach((item) => {
        expect(screen.queryByText(item)).not.toBeInTheDocument();
      });
    });
  });

  describe('Unauthenticated user', () => {
    it('sees no navigation items when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      });
      renderSidebar();

      ALL_NAV_ITEMS.forEach((item) => {
        expect(screen.queryByText(item)).not.toBeInTheDocument();
      });
    });
  });
});
