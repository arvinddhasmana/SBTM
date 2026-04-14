import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from './Login';

vi.mock('../services/api', () => ({
  parentApi: {
    login: vi.fn().mockResolvedValue({
      accessToken: 'test-token',
      user: {
        id: 'parent-1',
        email: 'test@example.com',
        role: 'PARENT',
        firstName: 'Test',
        lastName: 'Parent',
      },
    }),
    getChildren: vi.fn().mockResolvedValue([]),
    // getMe is called by AuthContext on startup when localStorage has data.
    // For Login tests, localStorage is empty so getMe is never invoked.
    getMe: vi.fn().mockResolvedValue({ id: 'parent-1', email: 'test@example.com', role: 'PARENT' }),
  },
}));

// Mock useNavigate
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('Login Page', () => {
  it('renders login form', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );
    expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('handles login form submission', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();

    // Wait for Mock async login
    await waitFor(
      () => {
        expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
      },
      { timeout: 2000 },
    );
  });
});
