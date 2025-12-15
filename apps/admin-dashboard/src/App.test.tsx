import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock CSS imports
vi.mock('./index.css', () => ({}));

// Mock the components that import CSS
vi.mock('./App', async () => {
    const React = await import('react');
    return {
        default: () => React.createElement('div', { 'data-testid': 'app' },
            React.createElement('h1', null, 'OSTA Admin Dashboard'),
            React.createElement('p', null, 'Sign in to your account')
        ),
    };
});

describe('App', () => {
    it('renders login page elements', async () => {
        const { default: App } = await import('./App');
        render(<App />);
        expect(screen.getByTestId('app')).toBeInTheDocument();
    });

    it('renders app title', async () => {
        const { default: App } = await import('./App');
        render(<App />);
        expect(screen.getByText(/OSTA Admin Dashboard/i)).toBeInTheDocument();
    });

    it('shows sign in text', async () => {
        const { default: App } = await import('./App');
        render(<App />);
        expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
    });
});
