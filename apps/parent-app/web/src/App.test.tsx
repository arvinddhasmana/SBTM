import { render, screen } from '@testing-library/react';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App', () => {
    it('renders login page by default', () => {
        render(<App />);
        // Check for "Sign in to your account" text
        expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
    });
});
