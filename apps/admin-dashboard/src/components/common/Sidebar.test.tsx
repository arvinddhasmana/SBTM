import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { AuthProvider } from '../../context/AuthContext';

// Wrapper component to provide required context
const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                {component}
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('Sidebar', () => {
    const defaultProps = {
        width: 256,
        isCollapsed: false,
        onToggleCollapse: () => { },
    };

    it('renders the logo and title', () => {
        renderWithProviders(<Sidebar {...defaultProps} />);

        expect(screen.getByText('OSTA Admin')).toBeInTheDocument();
        expect(screen.getByText('Transport Management')).toBeInTheDocument();
    });

    it('renders all navigation links', () => {
        renderWithProviders(<Sidebar {...defaultProps} />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Alerts')).toBeInTheDocument();
        expect(screen.getByText('Routes')).toBeInTheDocument();
        expect(screen.getByText('Students')).toBeInTheDocument();
        expect(screen.getByText('Videos')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders logout button', () => {
        renderWithProviders(<Sidebar {...defaultProps} />);

        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('navigation links have correct paths', () => {
        renderWithProviders(<Sidebar {...defaultProps} />);

        expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
        expect(screen.getByText('Alerts').closest('a')).toHaveAttribute('href', '/alerts');
        expect(screen.getByText('Routes').closest('a')).toHaveAttribute('href', '/routes');
        expect(screen.getByText('Students').closest('a')).toHaveAttribute('href', '/students');
        expect(screen.getByText('Videos').closest('a')).toHaveAttribute('href', '/videos');
        expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
    });
});
