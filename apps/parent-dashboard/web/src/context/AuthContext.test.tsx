import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Mock parentApi — use vi.hoisted so refs are available inside the factory.
// ---------------------------------------------------------------------------

const { mockLogin, mockGetChildren, mockGetMe } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockGetChildren: vi.fn(),
  mockGetMe: vi.fn(),
}));

vi.mock('../services/api', () => ({
  parentApi: {
    login: mockLogin,
    getChildren: mockGetChildren,
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: mockGetMe,
  },
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

const STORED_PARENT = JSON.stringify({
  id: 'parent-1',
  email: 'parent1@sbtm.demo',
  name: 'Sarah Smith',
  children: [],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts loading and resolves to null when no stored user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // With no stored user, getMe is never called and isLoading becomes false
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it('restores session when stored user is valid and role is PARENT', async () => {
    localStorage.setItem('parent_user', STORED_PARENT);
    mockGetMe.mockResolvedValue({ id: 'parent-1', email: 'parent1@sbtm.demo', role: 'PARENT' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetMe).toHaveBeenCalledOnce();
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('parent1@sbtm.demo');
  });

  it('clears session when stored user exists but getMe returns admin role', async () => {
    localStorage.setItem('parent_user', STORED_PARENT);
    mockGetMe.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@sbtm.demo',
      role: 'SCHOOL_ADMIN',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Wrong role — session should be cleared
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('parent_user')).toBeNull();
  });

  it('clears session when stored user exists but getMe returns null (expired/invalid)', async () => {
    localStorage.setItem('parent_user', STORED_PARENT);
    mockGetMe.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('parent_user')).toBeNull();
  });

  it('clears session when getMe returns OSTA_ADMIN role', async () => {
    localStorage.setItem('parent_user', STORED_PARENT);
    mockGetMe.mockResolvedValue({ id: 'osta-1', email: 'osta@sbtm.demo', role: 'OSTA_ADMIN' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('parent_user')).toBeNull();
  });

  it('stores user in localStorage and sets user state after login', async () => {
    const loginResponse = {
      accessToken: 'test-jwt',
      user: {
        id: 'parent-1',
        email: 'parent1@sbtm.demo',
        role: 'PARENT',
        firstName: 'Sarah',
        lastName: 'Smith',
      },
    };
    mockLogin.mockResolvedValue(loginResponse);
    mockGetChildren.mockResolvedValue([]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('parent1@sbtm.demo', 'Admin123!');
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('parent1@sbtm.demo');
    expect(localStorage.getItem('parent_user')).not.toBeNull();
  });

  it('clears localStorage on logout', async () => {
    localStorage.setItem('parent_user', STORED_PARENT);
    mockGetMe.mockResolvedValue({ id: 'parent-1', email: 'parent1@sbtm.demo', role: 'PARENT' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('parent_user')).toBeNull();
  });
});
