import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

const mockUseAuth = vi.fn();
const mockUsePageVisibility = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../context/PageVisibilityContext', () => ({
  usePageVisibility: () => mockUsePageVisibility(),
}));

// Map translation keys to display text
const TRANSLATIONS: Record<string, string> = {
  'nav.dashboard': 'Dashboard',
  'nav.alerts': 'Alerts',
  'nav.operational': 'Operational',
  'nav.routes': 'Routes',
  'nav.planner': 'Planner',
  'nav.fleet': 'Fleet',
  'nav.compliance': 'Compliance',
  'nav.assignments': 'Assignments',
  'nav.students': 'Students',
  'nav.absences': 'Absences',
  'nav.boards': 'Boards',
  'nav.schools': 'Schools',
  'nav.users': 'Users',
  'nav.alertConfig': 'Alert Config',
  'nav.gpsSource': 'GPS Tracker',
  'nav.pageVisibility': 'Page Visibility',
  'nav.settings': 'Settings',
  'nav.logout': 'Logout',
  'nav.collapseMenu': 'Collapse Menu',
  'nav.expandMenu': 'Expand Menu',
  'app.title': 'OSTA Admin',
  'app.subtitle': 'Transport Management',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => TRANSLATIONS[key] ?? key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

const createAuthMock = (role: string) => ({
  user: { id: 'test-user', email: 'admin@test.com', name: 'Test Admin', role },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
});

// Default: all pages visible
const allVisiblePageVisibility = {
  isPageVisible: () => true,
  records: [],
  isLoading: false,
};

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

// All nav items that SUPER_ADMIN should see (including Page Visibility)
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
  'Page Visibility',
];

// Items available to all admin roles
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

describe('Sidebar', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(createAuthMock('SUPER_ADMIN'));
    mockUsePageVisibility.mockReturnValue(allVisiblePageVisibility);
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
    expect(screen.getByText('Page Visibility').closest('a')).toHaveAttribute(
      'href',
      '/page-visibility',
    );
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

    it('sees hidden pages regardless of visibility settings', () => {
      mockUsePageVisibility.mockReturnValue({
        isPageVisible: (key: string) => key !== 'alerts',
        records: [{ pageKey: 'alerts', pageName: 'Alerts', isVisible: false }],
        isLoading: false,
      });
      renderSidebar();
      // Super Admin always sees Alerts even when hidden
      expect(screen.getByText('Alerts')).toBeInTheDocument();
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

    it('does not see Users or Page Visibility', () => {
      renderSidebar();

      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Page Visibility')).not.toBeInTheDocument();
    });

    it('does not see pages hidden by Super Admin', () => {
      mockUsePageVisibility.mockReturnValue({
        isPageVisible: (key: string) => key !== 'alerts',
        records: [{ pageKey: 'alerts', pageName: 'Alerts', isVisible: false }],
        isLoading: false,
      });
      renderSidebar();
      expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
    });

    it('still sees pages that are not hidden', () => {
      mockUsePageVisibility.mockReturnValue({
        isPageVisible: (key: string) => key !== 'alerts',
        records: [{ pageKey: 'alerts', pageName: 'Alerts', isVisible: false }],
        isLoading: false,
      });
      renderSidebar();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
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

    it('does not see pages hidden by Super Admin', () => {
      mockUsePageVisibility.mockReturnValue({
        isPageVisible: (key: string) => key !== 'students' && key !== 'compliance',
        records: [
          { pageKey: 'students', pageName: 'Students', isVisible: false },
          { pageKey: 'compliance', pageName: 'Compliance', isVisible: false },
        ],
        isLoading: false,
      });
      renderSidebar();
      expect(screen.queryByText('Students')).not.toBeInTheDocument();
      expect(screen.queryByText('Compliance')).not.toBeInTheDocument();
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
