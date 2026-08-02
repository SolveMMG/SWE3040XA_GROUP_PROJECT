import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../state/AuthContext.jsx';

// Mock the api module so no real HTTP calls are made
vi.mock('../services/api.js', () => ({
  api: vi.fn(),
  userFromApi: (u = {}) => ({ id: u.id || 1, name: u.name || 'Test User', ...u }),
}));

// Firebase Messaging requires Service Worker APIs not available in jsdom
vi.mock('../lib/firebase.js', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(null),
  onForegroundMessage: vi.fn(),
}));

import { api } from '../services/api.js';

function Probe() {
  const { currentUser, isAuthenticated, signIn, signUp, logout, updateUser } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{currentUser ? currentUser.name : 'none'}</span>
      <button onClick={() => signIn({ email: 'test@example.com', password: 'password123' })}>
        signIn
      </button>
      <button onClick={() => signUp({ name: 'Bob', email: 'bob@example.com', password: 'password123', role: 'driver' })}>
        signUp
      </button>
      <button onClick={logout}>logout</button>
      <button onClick={() => updateUser({ name: 'Alice Updated' })}>updateUser</button>
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
    localStorage.setItem('rideloop_token', 'token-123');
    localStorage.setItem('rideloop_user', JSON.stringify({ id: 1, name: 'Alice' }));
    renderProbe();
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('Alice');
  });

  it('signIn stores token and user in localStorage and marks authenticated', async () => {
    api.mockResolvedValueOnce({ token: 'new-tok', user: { id: 1, name: 'Alice' } });
    renderProbe();
    await act(async () => {
      screen.getByText('signIn').click();
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('Alice');
    expect(localStorage.getItem('rideloop_token')).toBe('new-tok');
    expect(JSON.parse(localStorage.getItem('rideloop_user')).name).toBe('Alice');
  });

  it('logout removes token and user from localStorage and marks unauthenticated', async () => {
    localStorage.setItem('rideloop_token', 'token-123');
    localStorage.setItem('rideloop_user', JSON.stringify({ id: 1, name: 'Alice' }));
    renderProbe();
    await act(async () => {
      screen.getByText('logout').click();
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(localStorage.getItem('rideloop_token')).toBeNull();
    expect(localStorage.getItem('rideloop_user')).toBeNull();
  });

  it('updateUser updates localStorage and state', async () => {
    api.mockResolvedValueOnce({ id: 1, name: 'Alice Updated' });
    localStorage.setItem('rideloop_token', 'token-123');
    localStorage.setItem('rideloop_user', JSON.stringify({ id: 1, name: 'Alice' }));
    renderProbe();
    await act(async () => {
      screen.getByText('updateUser').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Alice Updated'),
    );
    expect(JSON.parse(localStorage.getItem('rideloop_user')).name).toBe('Alice Updated');
  });

  it('useAuth throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside AuthProvider');
    spy.mockRestore();
  });
});
