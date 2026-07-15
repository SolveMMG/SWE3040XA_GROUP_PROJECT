import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../state/AuthContext.jsx';

// Mock the api module so no real HTTP calls are made
vi.mock('../services/api.js', () => ({
  default: {
    post: vi.fn(),
    get:  vi.fn(),
  },
}));

import api from '../services/api.js';

// Helper component that exposes context values via data-testid attributes
function Probe() {
  const { currentUser, isAuthenticated, setSession, clearSession, logout, refreshUser } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{currentUser ? currentUser.name : 'none'}</span>
      <button onClick={() => setSession({ id: 1, name: 'Alice' }, 'access-tok', 'refresh-tok')}>
        setSession
      </button>
      <button onClick={clearSession}>clearSession</button>
      <button onClick={logout}>logout</button>
      <button onClick={refreshUser}>refreshUser</button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when localStorage is empty', () => {
    renderProbe();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('restores session from localStorage on mount', () => {
    localStorage.setItem('rc_user', JSON.stringify({ id: 1, name: 'Alice' }));
    renderProbe();
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('Alice');
  });

  it('setSession stores tokens and user in localStorage and marks authenticated', async () => {
    renderProbe();
    await act(async () => {
      screen.getByText('setSession').click();
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('Alice');
    expect(localStorage.getItem('rc_access_token')).toBe('access-tok');
    expect(localStorage.getItem('rc_refresh_token')).toBe('refresh-tok');
    expect(JSON.parse(localStorage.getItem('rc_user')).name).toBe('Alice');
  });

  it('clearSession removes tokens from localStorage and marks unauthenticated', async () => {
    localStorage.setItem('rc_user', JSON.stringify({ id: 1, name: 'Alice' }));
    localStorage.setItem('rc_access_token', 'tok');
    renderProbe();
    await act(async () => {
      screen.getByText('clearSession').click();
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(localStorage.getItem('rc_user')).toBeNull();
    expect(localStorage.getItem('rc_access_token')).toBeNull();
  });

  it('logout calls POST /auth/logout and clears the session', async () => {
    api.post.mockResolvedValue({});
    localStorage.setItem('rc_user', JSON.stringify({ id: 1, name: 'Alice' }));
    localStorage.setItem('rc_refresh_token', 'refresh-tok');
    renderProbe();
    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('false'),
    );
    expect(api.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-tok' });
    expect(localStorage.getItem('rc_user')).toBeNull();
  });

  it('logout clears session even if the API call fails', async () => {
    api.post.mockRejectedValue(new Error('network error'));
    localStorage.setItem('rc_user', JSON.stringify({ id: 1, name: 'Alice' }));
    renderProbe();
    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('false'),
    );
  });

  it('refreshUser fetches /users/me, updates localStorage and state', async () => {
    api.get.mockResolvedValue({ data: { user: { id: 1, name: 'Alice Updated' } } });
    localStorage.setItem('rc_user', JSON.stringify({ id: 1, name: 'Alice' }));
    renderProbe();
    await act(async () => {
      screen.getByText('refreshUser').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Alice Updated'),
    );
    expect(JSON.parse(localStorage.getItem('rc_user')).name).toBe('Alice Updated');
  });

  it('refreshUser clears session when /users/me fails', async () => {
    api.get.mockRejectedValue(new Error('401'));
    localStorage.setItem('rc_user', JSON.stringify({ id: 1, name: 'Alice' }));
    renderProbe();
    await act(async () => {
      screen.getByText('refreshUser').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('false'),
    );
  });

  it('useAuth throws when used outside AuthProvider', () => {
    // Suppress React's error boundary output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside AuthProvider');
    spy.mockRestore();
  });
});
